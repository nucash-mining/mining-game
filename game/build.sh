#!/usr/bin/env bash
# Build the single-file game from its parts. Order matters.
set -e
cd "$(dirname "$0")"
cat parts/p01_head.html parts/p02_css2.html parts/p03_dom.html parts/p10c_keys.html parts/p04_data.html \
    parts/p05_audio.html parts/p06_scene.html parts/p07_models.html parts/p08_rigs.html \
    parts/p08b_bench.html parts/p09_sim.html parts/p09b_web3.html parts/p09c_pools.html \
    parts/p10_ui.html parts/p10b_os.html parts/p11_loop.html parts/p12_trailer.html \
    > mining-game.html
# syntax check (extract the module script and run node --check)
python3 - <<'EOF'
import re
h = open('mining-game.html').read()
m = max(re.finditer(r'<script type="module">(.*?)</script>', h, re.S), key=lambda x: len(x.group(1)))
open('/tmp/module.mjs', 'w').write(m.group(1))
EOF
node --input-type=module --check < /tmp/module.mjs && echo "BUILD OK -> game/mining-game.html"
