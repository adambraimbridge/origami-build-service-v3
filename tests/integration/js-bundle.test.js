/* eslint-env mocha */
"use strict";

const request = require("supertest");
const process = require("process");
const proclaim = require("proclaim");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { Script } = require("vm");

const doesNotThrowInBrowserEnvironment = js => {
  const dom = new JSDOM(``, { runScripts: "outside-only" });
  const script = new Script(js);

  proclaim.doesNotThrow(() => {
    try {
      dom.runVMScript(script);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, `Expected to be valid browser-based JavaScript but it was not.`);

  return dom.window;
};

const doesThrowInBrowserEnvironment = (js, message) => {
  const dom = new JSDOM(``, { runScripts: "outside-only" });
  const script = new Script(js);
  proclaim.throws(() => {
    dom.runVMScript(script);
  }, message);
};

const HOST = process.env.HOST;

describe("/v3/bundles/js", function() {
  context("missing all parameters", function() {
    it("GET /v3/bundles/js", async function() {
      const response = await request(HOST).get("/v3/bundles/js");
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: The modules query parameter is required.",
      );
    });
  });

  context("invalid modules parameter", function() {
    it("GET /v3/bundles/js?modules", async function() {
      const response = await request(HOST).get("/v3/bundles/js?modules");
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: The modules query parameter is required.",
      );
    });

    it("GET /v3/bundles/js?modules=,,", async function() {
      const response = await request(HOST).get("/v3/bundles/js?modules=,,");
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: The modules query parameter can not be empty.",
      );
    });

    it("GET /v3/bundles/js?modules=!1", async function() {
      const response = await request(HOST).get(`/v3/bundles/js?modules=!1`);
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: The modules query parameter contains module names which are not valid: !1.",
      );
    });
  });

  context.skip("missing source parameter", function() {
    it("returns an error", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=@financial-times/o-date@*",
      );
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: Missing source query parameter, the value should be a valid biz-ops systemcode.",
      );
    });
  });

  context("basic request", function() {
    it("GET /v3/bundles/js?modules=@financial-times/o-date@*&source=test", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=@financial-times/o-date@*&source=test",
      );
      proclaim.deepEqual(response.statusCode, 200);
      proclaim.deepEqual(
        response.get("cache-control"),
        "public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      const window = doesNotThrowInBrowserEnvironment(response.text);
      proclaim.include(window.Origami, "@financial-times/o-date");
    });
  });

  context("requesting the same module multiple times", function() {
    it("GET /v3/bundles/js?modules=@financial-times/o-date@*,@financial-times/o-date@*", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=@financial-times/o-date@*,@financial-times/o-date@*",
      );
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: The modules query parameter contains duplicate module names.",
      );
    });

    it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.19,@financial-times/o-test-component@1.0.17%20-%201.0.19", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=@financial-times/o-test-component@1.0.19,@financial-times/o-test-component@1.0.17%20-%201.0.19",
      );

      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: The modules query parameter contains duplicate module names.",
      );
    });

    it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.17,@financial-times/o-test-component@1.0.19", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=@financial-times/o-test-component@1.0.17,@financial-times/o-test-component@1.0.19",
      );
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: The modules query parameter contains duplicate module names.",
      );
    });
  });

  context("requesting two different modules", async function() {
    it("GET /v3/bundles/js?modules=@financial-times/o-autoinit@1.5,@financial-times/o-date@*&source=test", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=@financial-times/o-autoinit@1.5,@financial-times/o-date@*&source=test",
      );

      proclaim.deepEqual(response.statusCode, 200);
      proclaim.deepEqual(
        response.get("cache-control"),
        "public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      const window = doesNotThrowInBrowserEnvironment(response.text);
      proclaim.include(window.Origami, "@financial-times/o-date");
      proclaim.include(window.Origami, "@financial-times/o-autoinit");
    });
  });

  context("invalid module name", function() {
    it("GET /v3/bundles/js?modules=o-autoinit_%25-test&source=test", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=o-autoinit_%25-test&source=test",
      );
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      doesThrowInBrowserEnvironment(
        response.text,
        // TODO: Is this a potential XSS?
        "Origami Build Service returned an error: The modules query parameter contains module names which are not valid: o-autoinit_%-test.",
      );
    });
  });

  context("invalid version", function() {
    it("GET /v3/bundles/js?modules=o-autoinit@!1&source=test", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=o-autoinit@!1&source=test",
      );
      proclaim.deepEqual(response.statusCode, 400);
      proclaim.deepEqual(
        response.get("cache-control"),
        "max-age=0, must-revalidate, no-cache, no-store",
      );
      proclaim.deepEqual(
        response.get("content-type"),
        "application/javascript;charset=UTF-8",
      );
      // TODO: Is this a potential XSS?
      doesThrowInBrowserEnvironment(
        response.text,
        "Origami Build Service returned an error: The version !1 in o-autoinit@!1 is not a valid version.\nPlease refer to TODO (build service documentation) for what is a valid version.",
      );
    });
  });

  context("module which does not exist", function() {
    it("GET /v3/bundles/js?modules=o-jake-does-not-exist&source=test", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=o-jake-does-not-exist&source=test",
      );
      proclaim.deepEqual(response.statusCode, 400);
      doesThrowInBrowserEnvironment(
        response.text,
        // TODO: Is this a potential XSS?
        "Origami Build Service returned an error: Because o-bundle depends on o-jake-does-not-exist@* which doesn't exist (could not find package o-jake-does-not-exist), version solving failed.\n",
      );
    });
  });

  context("version which does not exist", function() {
    it("GET /v3/bundles/js?modules=@financial-times/o-banner@1111111&source=test", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=@financial-times/o-banner@1111111&source=test",
      );
      proclaim.deepEqual(response.statusCode, 400);
      doesThrowInBrowserEnvironment(
        response.text,
        // TODO: Is this a potential XSS?
        "Origami Build Service returned an error: Because o-bundle depends on @financial-times/o-banner@1111111.0.0 which doesn't match any versions, version solving failed.\n",
      );
    });
  });

  context("attaches modules to the Origami global object", function() {
    it("GET /v3/bundles/js?modules=@financial-times/o-date@*&source=test", async function() {
      const response = await request(HOST).get(
        "/v3/bundles/js?modules=@financial-times/o-date@*&source=test",
      );

      const window = doesNotThrowInBrowserEnvironment(response.text);
      proclaim.include(window.Origami, "@financial-times/o-date");
    });
  });
});