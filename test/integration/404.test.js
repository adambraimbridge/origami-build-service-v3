"use strict";

const request = require("supertest");
global.Promise = require("bluebird");
Promise.config({
	longStackTraces: true,
});
describe("/404", function() {
	it("GET /404", function() {
		return request(this.app)
			.get("/404")
			.expect(404)
			.expect("content-type", "text/html; charset=utf-8");
	});
});
