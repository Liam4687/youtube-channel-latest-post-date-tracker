thonimport json
import os

def export_to_json(data, output_file='output.json'):
    """Export the scraped data to a JSON file."""
    try:
        with open(output_file, 'w') as file:
            json.dump(data, file, indent=4)
        print(f"Data successfully exported to {output_file}")
    except Exception as e:
        print(f"Error exporting data to JSON: {e}")