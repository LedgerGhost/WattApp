#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  WattApp Database Restore Script"
echo "=========================================="
echo ""

MONGO_URI="mongodb://localhost:27017/wattapp"


# Determine dump folder path
if [ -n "$1" ]; then
    DUMP_FOLDER="$1"
else
    # Default: look for 'dump' folder in current directory
    DUMP_FOLDER="./wattapp_database_dump"
fi

# Check if dump folder exists
if [ ! -d "$DUMP_FOLDER" ]; then
    echo -e "${RED}Error: Dump folder not found: $DUMP_FOLDER${NC}"
    echo ""
    echo "Usage: ./wattapp_restore.sh [dump_folder_path]"
    echo ""
    echo "Make sure you have the dump folder from the repository."
    echo "If you cloned the repo, the dump folder should be in the project root."
    exit 1
fi

# Check if wattapp database folder exists inside dump
if [ ! -d "$DUMP_FOLDER/wattapp" ]; then
    echo -e "${RED}Error: 'wattapp' database folder not found inside $DUMP_FOLDER${NC}"
    echo ""
    echo "Expected structure:"
    echo "  $DUMP_FOLDER/"
    echo "  └── wattapp/"
    echo "      ├── collection1.bson"
    echo "      ├── collection1.metadata.json"
    echo "      └── ..."
    exit 1
fi

echo "Dump folder: $DUMP_FOLDER"
echo "Target database: $MONGO_URI"
echo ""

# Show what collections will be restored
echo -e "${CYAN}Collections to restore:${NC}"
for bson_file in "$DUMP_FOLDER/wattapp/"*.bson; do
    if [ -f "$bson_file" ]; then
        collection_name=$(basename "$bson_file" .bson)
        echo "  - $collection_name"
    fi
done
echo ""

# Confirm before proceeding
echo -e "${YELLOW}WARNING: This will DROP existing collections and replace them!${NC}"
read -p "Do you want to continue? (y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""

# Restore the database
echo -e "${YELLOW}Restoring database...${NC}"
mongorestore --uri="$MONGO_URI" --drop "$DUMP_FOLDER"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: mongorestore failed!${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. MongoDB not running locally: brew services start mongodb-community"
    echo "  2. Wrong connection URI: edit MONGO_URI in this script"
    echo "  3. Network issues if using Atlas"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Restore completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Your WattApp database is now ready!"
echo ""
echo "To verify, you can run:"
echo "  mongosh \"$MONGO_URI\" --eval \"db.getCollectionNames()\""
echo ""
echo "Or connect with MongoDB Compass using:"
echo "  $MONGO_URI"
