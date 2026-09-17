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
});
