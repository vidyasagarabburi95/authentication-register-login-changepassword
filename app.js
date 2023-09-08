const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");
let db = null;

const startDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};
startDbAndServer();

const validatePassword = (password) => {
  return password.length > 4;
};
/*API 1
Path: /register
Method: POST
Request

Scenario 1

Description:

If the username already exists

Response
Status code
400
Status text
User already exists

Scenario 2

Description:

If the registrant provides a password with less than 5 characters

Response
Status code
400
Status text
Password is too short

Scenario 3

Description:

Successful registration of the registrant

Response
  
Status code
200
Status text
User created successfully */
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
  SELECT * FROM user WHERE username='${username}'`;
  const dbUserResponse = await db.get(selectUserQuery);

  if (dbUserResponse === undefined) {
    const createUserQuery = `
      INSERT INTO user
      (username, name, password, gender, location)
      VALUES
      (
          '${username}',
          '${name}',
          '${hashedPassword}',
          '${gender}',
          '${location}'
      )`;

    if (validatePassword(password)) {
      db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
/*API 2
Path: /login
Method: POST
Request
{
  "username": "adam_richard",
  "password": "richard_567"
}

Scenario 1

Description:

If an unregistered user tries to login

Response
Status code
400
Status text
Invalid user

Scenario 2

Description:

If the user provides incorrect password

Response
Status code
400
Status text
Invalid password

Scenario 3

Description:

Successful login of the user

Response
Status code
200
Status text
Login success! */
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkUsernameInDb = `
    SELECT * FROM user 
    WHERE username='${username}'`;
  const checkUser = await db.get(checkUsernameInDb);

  if (checkUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      checkUser.password
    );
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
/*API 3
Path: /change-password
Method: PUT
Request

Scenario 1

Description:

If the user provides incorrect current password

Response
Status code
400
Status text
Invalid current password

Scenario 2

Description:

If the user provides new password with less than 5 characters

Response
Status code
400
Status text
Password is too short

Scenario 3

Description:

Successful password update

Response
Status code
200
Status text
Password updated

 */
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const userQuery = `
    SELECT * FROM user 
    WHERE username='${username}';`;
  const dbUser = await db.get(userQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (validatePassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateQuery = `
          UPDATE user
          SET password='${hashedPassword}'
          WHERE username='${username}'`;
        await db.run(updateQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
