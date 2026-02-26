# Coolify MySQL Database Configuration Guide

## Database Setup in Coolify

Based on your Coolify configuration:
- **Database Name**: `Indothai_SGHADB`
- **Normal User**: `mysql`
- **Normal User Password**: (from Coolify config - click eye icon to reveal)
- **Root Password**: (from Coolify config - click eye icon to reveal)
- **Public Port**: `5431`
- **Internal Port**: `3306` (MySQL default)

## Environment Variables Configuration

### For Local Development (Connecting to Coolify Database)

If you're running the backend locally and connecting to the Coolify MySQL database:

```env
DB_NAME=Indothai_SGHADB
DB_USER=mysql
DB_PASSWORD=<normal_user_password_from_coolify>
DB_HOST=<your_coolify_server_public_ip_or_domain>
DB_PORT=5431
```

### For Production (Running in Coolify)

If your backend is also running in Coolify (same network):

```env
DB_NAME=Indothai_SGHADB
DB_USER=mysql
DB_PASSWORD=<normal_user_password_from_coolify>
DB_HOST=mysql-database-indothai  # Use the service name from Coolify
DB_PORT=3306  # Internal MySQL port
```

**OR** use the MySQL URL provided by Coolify:

```env
# Use the "MySQL URL (internal)" from Coolify config
# It will look like: mysql://mysql:password@mysql-database-indothai:3306/Indothai_SGHADB
# Parse this into individual variables or use it directly if your code supports connection strings
```

## Important Notes

1. **Port Configuration**: 
   - The port mapping `3000:5432` shown in Coolify is likely incorrect
   - MySQL uses port `3306` internally
   - Use port `3306` for internal connections
   - Use port `5431` for public/external connections

2. **User Credentials**:
   - Use the **Normal User** (`mysql`) for application connections
   - Do NOT use `root` user for application connections
   - The Normal User Password is what you need in `DB_PASSWORD`

3. **Connection URLs**:
   - Coolify provides "MySQL URL (internal)" and "MySQL URL (public)"
   - Click the eye icon to reveal these URLs
   - They contain all connection details in one string

4. **Network Access**:
   - For internal connections (backend in same Coolify network): Use internal URL/service name
   - For external connections (local development): Use public URL/IP and port 5431

## Troubleshooting

### Access Denied Error

If you see "Access denied for user 'mysql'@'...'":

1. **Verify credentials in Coolify**:
   - Go to your MySQL database project
   - Check "Normal User" field (should be `mysql`)
   - Click eye icon to reveal "Normal User Password"
   - Ensure these match your `.env` file

2. **Check MySQL permissions** (if you have root access):
   ```sql
   -- Connect to MySQL as root
   -- Grant permissions to mysql user
   GRANT ALL PRIVILEGES ON Indothai_SGHADB.* TO 'mysql'@'%' IDENTIFIED BY 'your_password';
   FLUSH PRIVILEGES;
   ```

3. **Verify database exists**:
   - The database `Indothai_SGHADB` should exist
   - Check in Coolify MySQL terminal or logs

### Connection Refused Error

1. **Check MySQL is running**:
   - In Coolify, ensure status shows "Running (healthy)"
   - Restart if needed

2. **Verify port**:
   - Internal: Use `3306`
   - External: Use `5431` (public port)

3. **Check host**:
   - Internal: Use service name `mysql-database-indothai`
   - External: Use public IP/domain

## Quick Setup Checklist

- [ ] Database name: `Indothai_SGHADB`
- [ ] User: `mysql` (not root)
- [ ] Password: Normal User Password from Coolify
- [ ] Host: Service name (internal) or public IP (external)
- [ ] Port: `3306` (internal) or `5431` (external)
- [ ] Database status: "Running (healthy)" in Coolify

