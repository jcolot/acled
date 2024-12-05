# Getting Started with this project

Run 

`docker-compose build`

followed by

`docker-compose run`

Setup the provider, for instance, Google.
Create a project
Set up OAuth 2.0 Client IDs
Set up an authorized redirect URI in your application, for instance in a local environment:
You need a service-account-file.json from Google, which you can download from the Google Cloud Console.
`http://localhost:1337/api/connect/google/callback`
