import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

// --- mirror of the game's price ladder (p04_data.html CFG.upPrice / upGrowth) ---
const upPrice = {
  power:  [400,1100,2600,6000,14000,32000,70000,160000, 368000,850000,1950000,4500000,10000000,24000000,55000000,125000000],
  cooling:[350,900,2200,5200,12000,28000,60000,130000, 300000,700000,1600000,3700000,8500000,20000000,45000000,100000000],
  rack:[1500,9000],
  rackgpu:[12000,30000,75000,180000,420000],
};
// contract uses integer x9/4 growth; replicate it exactly (not Math.pow) so the
// test checks the on-chain ladder, which is the authoritative one.
function priceWholeJS(kind, lv) {
  const arr = upPrice[kind];
  if (lv < arr.length) return BigInt(arr[lv]);
  let v = BigInt(arr[arr.length - 1]);
  const steps = lv - (arr.length - 1);
  for (let i = 0; i < steps; i++) v = (v * 9n) / 4n;
  return v;
}
const KIND = { power: 0, cooling: 1, rack: 2, rackgpu: 3 };
const WAD = 10n ** 18n;

describe("GarageUpgrades", function () {
  let owner, alice, bob, watt, stakers, garage;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const MockWATT = await ethers.getContractFactory("contracts/testing/MockWATT.sol:MockWATT");
    watt = await MockWATT.deploy();
    await watt.waitForDeployment();
    const MockStakers = await ethers.getContractFactory("contracts/testing/MockStakers.sol:MockStakers");
    stakers = await MockStakers.deploy(await watt.getAddress());
    await stakers.waitForDeployment();
    const Garage = await ethers.getContractFactory("contracts/game/GarageUpgrades.sol:GarageUpgrades");
    garage = await Garage.deploy(await watt.getAddress(), await stakers.getAddress());
    await garage.waitForDeployment();

    // fund players
    for (const u of [alice, bob]) await (await watt.mint(u.address, 10n ** 9n * WAD)).wait();
  });

  it("prices match the game ladder in and past the tables", async function () {
    for (const kind of ["power", "cooling"]) {
      for (const lv of [0, 1, 7, 15, 16, 17, 20]) {
        expect(await garage.priceWhole(KIND[kind], lv)).to.equal(priceWholeJS(kind, lv), `${kind} lv${lv}`);
      }
    }
    expect(await garage.priceWhole(KIND.rack, 0)).to.equal(1500n);
    expect(await garage.priceWhole(KIND.rack, 1)).to.equal(9000n);
    expect(await garage.priceWhole(KIND.rackgpu, 4)).to.equal(420000n);
    await expect(garage.priceWhole(KIND.rack, 2)).to.be.revertedWith("maxed");
    await expect(garage.priceWhole(KIND.rackgpu, 5)).to.be.revertedWith("maxed");
  });

  it("direct wallet-pay buy charges the exact price and funds the stakers pool", async function () {
    const cost = priceWholeJS("power", 0) * WAD; // 400 WATT
    await (await watt.connect(alice).approve(await garage.getAddress(), cost)).wait();
    const before = await watt.balanceOf(alice.address);
    await (await garage.connect(alice).buyUpgrade(KIND.power)).wait();
    expect(await watt.balanceOf(alice.address)).to.equal(before - cost);
    expect(await stakers.totalFunded()).to.equal(cost);
    expect(await garage.levelOf(alice.address, KIND.power)).to.equal(1);
  });

  it("top-up funds stakers now and lets later buys spend credit with no transfer", async function () {
    const topup = 5000n;
    await (await watt.connect(alice).approve(await garage.getAddress(), topup * WAD)).wait();
    await (await garage.connect(alice).topUp(topup)).wait();
    expect(await garage.creditOf(alice.address)).to.equal(topup * WAD);
    expect(await stakers.totalFunded()).to.equal(topup * WAD);

    const balBefore = await watt.balanceOf(alice.address);
    // buy power lv0 (400) + cooling lv0 (350) from credit — no approval, no transfer
    await (await garage.connect(alice).buyUpgrade(KIND.power)).wait();
    await (await garage.connect(alice).buyUpgrade(KIND.cooling)).wait();
    expect(await watt.balanceOf(alice.address)).to.equal(balBefore); // wallet untouched
    expect(await garage.creditOf(alice.address)).to.equal((topup - 400n - 350n) * WAD);
    expect(await garage.levelOf(alice.address, KIND.power)).to.equal(1);
    expect(await garage.levelOf(alice.address, KIND.cooling)).to.equal(1);
  });

  it("garageState returns all four levels plus credit in one call", async function () {
    await (await garage.connect(owner).restoreLevels(alice.address, 12, 10, 2, 5)).wait();
    await (await garage.connect(owner).grantCredit(alice.address, 1000)).wait();
    const s = await garage.garageState(alice.address);
    expect([s.power, s.cooling, s.rack, s.rackgpu]).to.deep.equal([12n, 10n, 2n, 5n]);
    expect(s.credit).to.equal(1000n * WAD);
  });

  it("rack ladders are capped", async function () {
    await (await watt.connect(alice).approve(await garage.getAddress(), 10n ** 9n * WAD)).wait();
    await (await garage.connect(alice).buyUpgrade(KIND.rack)).wait(); // lv1
    await (await garage.connect(alice).buyUpgrade(KIND.rack)).wait(); // lv2 (max)
    await expect(garage.connect(alice).buyUpgrade(KIND.rack)).to.be.revertedWith("maxed");
  });

  it("owner can restore; restore is a floor and never lowers a level", async function () {
    await (await garage.connect(owner).restoreLevels(alice.address, 8, 8, 1, 3)).wait();
    expect(await garage.levelOf(alice.address, KIND.power)).to.equal(8);
    // a lower restore does not reduce it
    await (await garage.connect(owner).restoreLevels(alice.address, 5, 9, 0, 3)).wait();
    expect(await garage.levelOf(alice.address, KIND.power)).to.equal(8);   // kept
    expect(await garage.levelOf(alice.address, KIND.cooling)).to.equal(9); // raised
    // non-owner cannot restore
    await expect(garage.connect(alice).restoreLevels(bob.address, 1, 1, 0, 0)).to.be.revertedWith("not owner");
  });

  it("restoreLevelsMany restores a batch", async function () {
    await (await garage.connect(owner).restoreLevelsMany(
      [alice.address, bob.address],
      [16, 4], [16, 4], [2, 0], [5, 1]
    )).wait();
    expect(await garage.levelOf(alice.address, KIND.power)).to.equal(16);
    expect(await garage.levelOf(bob.address, KIND.rackgpu)).to.equal(1);
  });
});
