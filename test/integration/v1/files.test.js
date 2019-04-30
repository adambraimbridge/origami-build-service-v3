"use strict";

const request = require("supertest");

describe("/v1/files", function() {
	it("GET /v1/files", function() {
		return request(this.app)
			.get("/v1/files")
			.expect(301)
			.expect(
				"location",
				"https://www.ft.com/__origami/service/build/v2/files",
			);
	});

	it("GET /v1/files?cachebust=1", function() {
		return request(this.app)
			.get("/v1/files?cachebust=1")
			.expect(301)
			.expect(
				"location",
				"https://www.ft.com/__origami/service/build/v2/files?cachebust=1",
			);
	});

	it("GET /v1/files/o-fonts-assets@1.3.0/BentonSans-Light.woff", function() {
		return request(this.app)
			.get("/v1/files/o-fonts-assets@1.3.0/BentonSans-Light.woff")
			.expect(301)
			.expect(
				"location",
				"https://www.ft.com/__origami/service/build/v2/files/o-fonts-assets@1.3.0/BentonSans-Light.woff",
			);
	});

	it("GET /v1/files/o-fonts-assets@1.3.0/BentonSans-Light.woff?cachebust=1", function() {
		return request(this.app)
			.get("/v1/files/o-fonts-assets@1.3.0/BentonSans-Light.woff?cachebust=1")
			.expect(301)
			.expect(
				"location",
				"https://www.ft.com/__origami/service/build/v2/files/o-fonts-assets@1.3.0/BentonSans-Light.woff?cachebust=1",
			);
	});
});
