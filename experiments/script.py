import matplotlib.pyplot as plt
import ast
import statistics
from datetime import datetime

# window size (seconds) for rolling average
WINDOW_SECONDS = 20 * 60

# window size (seconds) for HRV (RMSSD) calculation
HRV_WINDOW_SECONDS = 3600

# maximum allowed gap (seconds) in RR data for valid HRV segments
RR_GAP_THRESHOLD = 3

timestamps = []
values = []
rr_timestamps = []
rr_values = []

with open('data.txt') as f:
    for line in f:
        parts = line.split()
        if len(parts) < 3:
            continue
        ts = int(parts[0]) / 1000  # convert ms → s
        val = int(parts[1])
        rr_list = ast.literal_eval(parts[2])
        if 10 <= val <= 200:
            timestamps.append(datetime.fromtimestamp(ts))
            values.append(val)
        current_rr_ts = ts
        for rr in rr_list:
            rr_timestamps.append(current_rr_ts)
            rr_values.append(rr)
            # Sanity check scale assumption
            # Uncomment to inspect actual RR values:
            # print(rr_values[:10])
            current_rr_ts += rr / 1000  # RR in ms converted to seconds

# sort heart-rate data by timestamp
data = sorted(zip(timestamps, values), key=lambda x: x[0])
timestamps, values = zip(*data)
timestamps = list(timestamps)
values = list(values)

# compute rolling average of heart rate per WINDOW_SECONDS-second window
avg_times = []
avg_values = []
start_time = timestamps[0].timestamp()
end_time = timestamps[-1].timestamp()
current = start_time
idx = 0
n = len(timestamps)

while current <= end_time:
    bin_end = current + WINDOW_SECONDS
    sum_val = 0
    count = 0
    while idx < n and timestamps[idx].timestamp() < bin_end:
        sum_val += values[idx]
        count += 1
        idx += 1
    if count > 0:
        avg_times.append(datetime.fromtimestamp(current + WINDOW_SECONDS/2))
        avg_values.append(sum_val / count)
    current = bin_end

# sort RR data by timestamp and compute RMSSD per HRV_WINDOW_SECONDS-second window
if rr_timestamps:
    rr_data = sorted(zip(rr_timestamps, rr_values), key=lambda x: x[0])
    rr_timestamps, rr_values = zip(*rr_data)
    rr_timestamps = list(rr_timestamps)
    rr_values = list(rr_values)

    # split RR data into continuous segments where gaps ≤ RR_GAP_THRESHOLD
    rr_segments = []
    start_idx = 0
    for i in range(1, len(rr_timestamps)):
        if rr_timestamps[i] - rr_timestamps[i-1] > RR_GAP_THRESHOLD:
            rr_segments.append((start_idx, i-1))
            start_idx = i
    rr_segments.append((start_idx, len(rr_timestamps)-1))

    hrv_times = []
    hrv_values = []

    # compute RMSSD in each valid segment
    for (s_idx, e_idx) in rr_segments:
        seg_ts = rr_timestamps[s_idx:e_idx+1]
        seg_vals = rr_values[s_idx:e_idx+1]
        seg_start = seg_ts[0]
        seg_end = seg_ts[-1]
        current = seg_start
        while current <= seg_end:
            bin_end = current + HRV_WINDOW_SECONDS
            bin_rrs = [v for t, v in zip(seg_ts, seg_vals) if current <= t < bin_end]
            if len(bin_rrs) > 1:
                diffs = [j - i for i, j in zip(bin_rrs[:-1], bin_rrs[1:])]
                rmssd = (sum(d*d for d in diffs) / len(diffs)) ** 0.5
                if 10 < rmssd < 200:
                    hrv_times.append(datetime.fromtimestamp(current + HRV_WINDOW_SECONDS/2))
                    hrv_values.append(rmssd)
            current = bin_end
else:
    hrv_times = []
    hrv_values = []

fig, ax1 = plt.subplots(figsize=(10, 4))

# Heart rate scatter
ax1.scatter(timestamps, values, s=0.1, color="blue")

# Split HR rolling-average into segments based on gaps > WINDOW_SECONDS
hr_segments_times = []
hr_segments_values = []
if avg_times:
    seg_times = [avg_times[0]]
    seg_vals = [avg_values[0]]
    for i in range(1, len(avg_times)):
        gap = (avg_times[i] - avg_times[i-1]).total_seconds()
        if gap > WINDOW_SECONDS:
            hr_segments_times.append(seg_times)
            hr_segments_values.append(seg_vals)
            seg_times = []
            seg_vals = []
        seg_times.append(avg_times[i])
        seg_vals.append(avg_values[i])
    hr_segments_times.append(seg_times)
    hr_segments_values.append(seg_vals)

# Plot each HR average segment in red
for seg_times, seg_vals in zip(hr_segments_times, hr_segments_values):
    ax1.plot(seg_times, seg_vals, linewidth=1.5, color="red")

ax1.set_xlabel("Time")
ax1.set_ylabel("Heart Rate (bpm)", color="blue")
ax1.tick_params(axis='y', labelcolor="blue")

# RMSSD-based HRV on second y-axis
ax2 = ax1.twinx()

# Split HRV series into segments based on gaps > HRV_WINDOW_SECONDS
hrv_segments_times = []
hrv_segments_values = []
if hrv_times:
    seg_hrv_times = [hrv_times[0]]
    seg_hrv_vals = [hrv_values[0]]
    for i in range(1, len(hrv_times)):
        gap_rr = (hrv_times[i] - hrv_times[i-1]).total_seconds()
        if gap_rr > HRV_WINDOW_SECONDS:
            hrv_segments_times.append(seg_hrv_times)
            hrv_segments_values.append(seg_hrv_vals)
            seg_hrv_times = []
            seg_hrv_vals = []
        seg_hrv_times.append(hrv_times[i])
        seg_hrv_vals.append(hrv_values[i])
    hrv_segments_times.append(seg_hrv_times)
    hrv_segments_values.append(seg_hrv_vals)

# Plot each HRV segment in green
# for seg_times, seg_vals in zip(hrv_segments_times, hrv_segments_values):
#     ax2.plot(seg_times, seg_vals, color="green", linewidth=1.5)

ax2.set_ylabel("HRV (RMSSD, ms)", color="green")
ax2.tick_params(axis='y', labelcolor="green")

fig.tight_layout()
plt.show()