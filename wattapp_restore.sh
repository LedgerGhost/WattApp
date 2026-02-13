mongosh wattapp --eval 'db.getCollectionNames().forEach(c => db[c].drop())'
mongorestore --db wattapp wattapp_database_dump/wattapp/wattapp
