## Models

each models will carry timestamps (createdAt, updatedAt)
### User

- id: uuid, not-null, default: auto-gen
- email: unique, not-null
- password_hash: text, not-null


### Survey

- id: uuid, not-null, default: auto-gen
- title: text, not-null
- user_id: fkey -> user.id, not-null
- status: enum: ('published' | 'draft'), default: draft


### Survey Submission

- id: uuid, not-null, default: auto-gen
- email: text, not-null
- survey: fkey -> survey, not-null


### Survey Question

- id: uuid, not-null, default: auto-gen
- survey: fkey -> survey, not-null
- title: text, not-null
- type: enum ('select' | 'multi-select' | 'short_text' | 'long_text')
- order: number | not-null | default: current_survey_q + 1


### Survey Answer
- id: uuid, not-null, default: auto-gen
- survey_question: uuid, fkey -> survey_question.id
- value: jsonb -- so it can store all types of survey questions' answer
- submission_id: fkey -> submission.id
- constraint (survey_question, submission_id)

