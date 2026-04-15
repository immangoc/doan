# Final Gap Fix - Item E

You are a senior Java backend engineer.

Implement ONLY this missing item:

## Item
Add swap endpoint for two containers' positions.

## Required behavior
- Add endpoint: `POST /admin/yard/swap`
- Swap positions of two containers atomically
- Validate both containers currently have positions
- Validate swap is safe and transactionally consistent
- Use @Transactional
- Follow architecture in `architecture.txt`
- Keep business logic in service layer
- Do not change database schema
- Do not use Python

## Required output
1. request DTO
2. service method
3. controller endpoint
4. validation logic
5. summary of changed files only