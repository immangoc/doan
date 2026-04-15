Create initial seed data for ADMIN account.

Requirements:

1. Insert default roles and permissions if not exists:
    - ADMIN (full access)

2. Create an admin user:
    - username: admin
    - password: encode using BCrypt (not plain text)
    - email: hoangtanh21102002@gmail.com
    - status: ACTIVE

3. Assign ROLE_ADMIN to this user.

4. Follow existing database schema and entity structure in project.
5. Use Flyway migration (create new V__ migration file) OR data.sql depending on current project convention.
6. Do NOT duplicate data if already exists (use conditional insert or check logic if needed).

Output:
- SQL migration file OR code-based initializer (whichever fits current project)
- clearly show role, user, and user_role mapping