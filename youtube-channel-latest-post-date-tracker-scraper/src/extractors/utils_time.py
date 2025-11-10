thonfrom datetime import datetime

def parse_iso_date(date_string):
    """Parse an ISO 8601 date string into a datetime object."""
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except ValueError:
        print(f"Invalid date format: {date_string}")
        return None