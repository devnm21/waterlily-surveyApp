## Models


### User

- id: uuid, not-null, default: auto-gen
- email: unique, not-null
- password_hash: text, not-null
- 