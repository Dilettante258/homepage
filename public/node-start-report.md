# Express Runtime Benchmark Report

## Run Config
- requests: 200000
- concurrency: 100
- repeats: 5
- scenarios: ping, middlewares, json, payload, route1, route2, route3, route4, orm
- modes: tsx, tsc, esbuild
- machine: darwin/arm64
- node: v22.22.0

## Environment: host

### Scenario: ping
1. tsc: req/s=28350.41, p95=4.00ms, cold=308.00ms, rssPeak=62.87MB, cpuPeak=9.00%, speedup(vs tsc)=1.000x
2. esbuild: req/s=27766.17, p95=4.40ms, cold=104.20ms, rssPeak=62.72MB, cpuPeak=11.22%, speedup(vs tsc)=0.979x
3. tsx: req/s=27187.24, p95=4.00ms, cold=399.00ms, rssPeak=62.80MB, cpuPeak=5.92%, speedup(vs tsc)=0.959x

### Scenario: middlewares
1. esbuild: req/s=26426.39, p95=4.60ms, cold=104.20ms, rssPeak=62.84MB, cpuPeak=9.72%, speedup(vs tsc)=1.010x
2. tsc: req/s=26176.13, p95=5.00ms, cold=308.00ms, rssPeak=62.71MB, cpuPeak=9.46%, speedup(vs tsc)=1.000x
3. tsx: req/s=26010.96, p95=4.60ms, cold=399.00ms, rssPeak=62.81MB, cpuPeak=6.50%, speedup(vs tsc)=0.994x

### Scenario: json
1. tsc: req/s=16769.16, p95=7.00ms, cold=308.00ms, rssPeak=62.66MB, cpuPeak=9.02%, speedup(vs tsc)=1.000x
2. tsx: req/s=16768.08, p95=7.00ms, cold=399.00ms, rssPeak=62.88MB, cpuPeak=6.00%, speedup(vs tsc)=1.000x
3. esbuild: req/s=16544.64, p95=7.00ms, cold=104.20ms, rssPeak=62.82MB, cpuPeak=14.64%, speedup(vs tsc)=0.987x

### Scenario: payload
1. tsc: req/s=12696.86, p95=9.00ms, cold=308.00ms, rssPeak=62.75MB, cpuPeak=9.22%, speedup(vs tsc)=1.000x
2. esbuild: req/s=12662.08, p95=9.20ms, cold=104.20ms, rssPeak=62.69MB, cpuPeak=12.48%, speedup(vs tsc)=0.997x
3. tsx: req/s=12600.30, p95=9.00ms, cold=399.00ms, rssPeak=62.73MB, cpuPeak=5.50%, speedup(vs tsc)=0.992x

### Scenario: route1
1. tsc: req/s=24658.12, p95=5.00ms, cold=308.00ms, rssPeak=62.70MB, cpuPeak=9.32%, speedup(vs tsc)=1.000x
2. tsx: req/s=24492.20, p95=5.00ms, cold=399.00ms, rssPeak=62.67MB, cpuPeak=5.32%, speedup(vs tsc)=0.993x
3. esbuild: req/s=23996.92, p95=5.20ms, cold=104.20ms, rssPeak=62.78MB, cpuPeak=11.36%, speedup(vs tsc)=0.973x

### Scenario: route2
1. tsc: req/s=24648.62, p95=5.00ms, cold=308.00ms, rssPeak=62.76MB, cpuPeak=9.64%, speedup(vs tsc)=1.000x
2. tsx: req/s=24638.19, p95=5.00ms, cold=399.00ms, rssPeak=62.94MB, cpuPeak=6.18%, speedup(vs tsc)=1.000x
3. esbuild: req/s=24488.03, p95=5.00ms, cold=104.20ms, rssPeak=62.89MB, cpuPeak=13.24%, speedup(vs tsc)=0.993x

### Scenario: route3
1. esbuild: req/s=24078.83, p95=5.00ms, cold=104.20ms, rssPeak=62.82MB, cpuPeak=12.06%, speedup(vs tsc)=1.003x
2. tsc: req/s=24000.25, p95=5.00ms, cold=308.00ms, rssPeak=62.72MB, cpuPeak=9.44%, speedup(vs tsc)=1.000x
3. tsx: req/s=23795.04, p95=5.00ms, cold=399.00ms, rssPeak=62.65MB, cpuPeak=6.08%, speedup(vs tsc)=0.991x

### Scenario: route4
1. tsx: req/s=22874.67, p95=5.00ms, cold=399.00ms, rssPeak=62.89MB, cpuPeak=5.52%, speedup(vs tsc)=1.006x
2. esbuild: req/s=22838.33, p95=5.00ms, cold=104.20ms, rssPeak=62.85MB, cpuPeak=8.62%, speedup(vs tsc)=1.004x
3. tsc: req/s=22742.45, p95=5.00ms, cold=308.00ms, rssPeak=62.66MB, cpuPeak=8.42%, speedup(vs tsc)=1.000x

### Scenario: orm
1. tsc: req/s=18992.82, p95=6.00ms, cold=308.00ms, rssPeak=62.81MB, cpuPeak=8.64%, speedup(vs tsc)=1.000x
2. tsx: req/s=18991.92, p95=6.00ms, cold=399.00ms, rssPeak=62.77MB, cpuPeak=5.58%, speedup(vs tsc)=1.000x
3. esbuild: req/s=18831.75, p95=6.20ms, cold=104.20ms, rssPeak=62.80MB, cpuPeak=13.70%, speedup(vs tsc)=0.992x

## Failed Requests
- none
