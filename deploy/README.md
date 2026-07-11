# Laragon Apache Deployment
# Copy www/ contents to your web server root
# Then install backend/ with npm install

# Structure after deploy:
# www/
#   backupcentral/
#     .htaccess          <- from deploy/.htaccess
#     proxy.php          <- from deploy/proxy.php
#     index.html         <- from frontend/dist/
#     assets/            <- from frontend/dist/assets/
#     backend/
#       .env             <- copy from backend/.env.example, fill in values
#       package.json
#       src/

# Quick deploy on Synology NAS with Laragon:
# 1. Copy deploy/.htaccess and deploy/proxy.php to www/backupcentral/
# 2. Copy frontend/dist/* to www/backupcentral/
# 3. Copy backend/ to www/backupcentral/backend/
# 4. cd www/backupcentral/backend && npm install
# 5. Create backend/.env from .env.example
# 6. Run init.sql on your MySQL server
# 7. Access http://your-nas:9080/backupcentral/
