<<<<<<< HEAD
# HRMS micro-frontends

An npm-workspaces HRMS frontend built with React, TypeScript, Tailwind CSS, and Webpack Module Federation.

## Apps

| App | Development URL | Federation name |
| --- | --- | --- |
| Host | http://localhost:3001 | `host` |
| Auth | http://localhost:3000 | `auth` |
| Employees | http://localhost:3002 | `employees` |
| Payroll | http://localhost:3003 | `payroll` |
| Attendance | http://localhost:3004 | `attendance` |

## Run

```bash
npm install
npm run dev
```

Use `npm run build` for production bundles and `npm run typecheck` to validate TypeScript.

## Google sign-in

Inject Cognito's Hosted UI details before the host loads. The redirect URI must be registered in the Cognito app client and should point to the host shell.

```html
<script>
  window.__HRMS_AMPLIFY_CONFIG__ = {
    userPoolId: 'ap-south-1_example', userPoolClientId: 'exampleclientid',
    cognitoDomain: 'your-domain.auth.ap-south-1.amazoncognito.com',
    redirectSignIn: 'http://localhost:3000', redirectSignOut: 'http://localhost:3000'
  };
</script>
```

After Cognito redirects back, the auth remote fetches the session, stores ID and access JWTs in `sessionStorage`, and selects the Employees module in the host shell.

`backend-api/` is intentionally empty and reserved for the NestJS application.
=======
# enterprise
>>>>>>> a12e4a7bfa693a9b1951f93f738d14b866b21202
