import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./app.js";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("users and auth", () => {
  const email = "user@example.com";
  const password = "password1";

  it("registers a user without leaking the hash", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.id).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("rejects empty register bodies", async () => {
    const res = await request(app).post("/users").send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ status: 400, error: expect.any(String) });
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/users").send({
      email: "dup@example.com",
      password,
    });
    const res = await request(app).post("/users").send({
      email: "dup@example.com",
      password,
    });
    expect(res.status).toBe(409);
  });

  it("logs in with the same credentials", async () => {
    await request(app).post("/users").send({
      email: "login@example.com",
      password,
    });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("login@example.com");
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("rejects a wrong password without enumerating users", async () => {
    await request(app).post("/users").send({
      email: "wrong-pw@example.com",
      password,
    });
    const badPassword = await request(app)
      .post("/auth/login")
      .send({ email: "wrong-pw@example.com", password: "password2" });
    expect(badPassword.status).toBe(401);
    expect(badPassword.body).toEqual({
      error: "Invalid email or password",
      status: 401,
    });

    const unknownUser = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password });
    expect(unknownUser.body).toEqual(badPassword.body);
  });

  it("sets a session cookie on login", async () => {
    await request(app).post("/users").send({
      email: "cookie@example.com",
      password,
    });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "cookie@example.com", password });
    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toMatch(/sid=/);
    expect(String(setCookie)).toMatch(/HttpOnly/i);
  });

  it("rejects /auth/me without a session", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized", status: 401 });
  });

  it("starts a session on register", async () => {
    const agent = request.agent(app);
    const created = await agent.post("/users").send({
      email: "after-signup@example.com",
      password,
    });
    expect(created.status).toBe(201);
    const res = await agent.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("after-signup@example.com");
  });

  it("returns the current user when the session cookie is sent", async () => {
    const agent = request.agent(app);
    await agent.post("/users").send({
      email: "session@example.com",
      password,
    });
    await agent.post("/auth/login").send({
      email: "session@example.com",
      password,
    });
    const res = await agent.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("session@example.com");
    expect(res.body.user.id).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("clears the session on logout", async () => {
    const agent = request.agent(app);
    await agent.post("/users").send({
      email: "logout@example.com",
      password,
    });
    await agent.post("/auth/login").send({
      email: "logout@example.com",
      password,
    });
    const logout = await agent.post("/auth/logout");
    expect(logout.status).toBe(200);
    const me = await agent.get("/auth/me");
    expect(me.status).toBe(401);
  });
});
