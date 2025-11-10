thonimport json
import os
from extractors.youtube_parser import get_latest_post_date
from outputs.exporters import export_to_json
from config.settings import CONFIG

def main():
    channels = load_channels()
    results = {}

    for channel in channels:
        latest_post_date = get_latest_post_date(channel)
        results[channel] = latest_post_date

    export_to_json(results)

def load_channels():
    # Load channel names/URLs from a sample file or user input
    with open(os.path.join(CONFIG['data_dir'], 'inputs.sample.txt'), 'r') as file:
        return [line.strip() for line in file.readlines()]

if __name__ == "__main__":
    main()