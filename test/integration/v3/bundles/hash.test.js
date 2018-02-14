"use strict";

const itRespondsWithContentType = require("../../helpers/it-responds-with-content-type");
const itRespondsWithHeader = require("../../helpers/it-responds-with-header");
const itRespondsWithStatus = require("../../helpers/it-responds-with-status");
const setupRequest = require("../../helpers/setup-request");

describe("/v3/bundles/hash", () => {
	describe("GET /v3/bundles/hash", function() {
		setupRequest("GET", "/v3/bundles/hash");
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules", function() {
		setupRequest("GET", "/v3/bundles/hash?modules");
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=,,", function() {
		setupRequest("GET", "/v3/bundles/hash?modules=,,");
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=1a-", function() {
		setupRequest("GET", "/v3/bundles/hash?modules=1a-");
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.19", function() {
		setupRequest("GET", "/v3/bundles/hash?modules=o-test-component@1.0.19");
		itRespondsWithStatus(200);
		itRespondsWithHeader("etag", 'W/"82-gmF/F2U6dQcTdci8LX6bDoOr954"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"07720b05fef2ee32717aae0cb9ac98f0636f59af6a697a9bb55013d1861d817c91c1d616a9f83e4a4292a5b6e3e45d7e0d6285a9a64e699a026a83f32ee938a2",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.17%20-%201.0.19", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.17%20-%201.0.19",
		);
		itRespondsWithStatus(200);
		itRespondsWithHeader("etag", 'W/"82-gmF/F2U6dQcTdci8LX6bDoOr954"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"07720b05fef2ee32717aae0cb9ac98f0636f59af6a697a9bb55013d1861d817c91c1d616a9f83e4a4292a5b6e3e45d7e0d6285a9a64e699a026a83f32ee938a2",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.19,o-test-component@1.0.19", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.19,o-test-component@1.0.19",
		);
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.19,o-test-component@1.0.17%20-%201.0.19", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.19,o-test-component@1.0.17%20-%201.0.19",
		);
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.17,o-test-component@1.0.19", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.17,o-test-component@1.0.19",
		);
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-autoinit@1.3.3,o-test-component@1.0.19", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-autoinit@1.3.3,o-test-component@1.0.19",
		);
		itRespondsWithStatus(200);
		itRespondsWithHeader("etag", 'W/"82-gmF/F2U6dQcTdci8LX6bDoOr954"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"07720b05fef2ee32717aae0cb9ac98f0636f59af6a697a9bb55013d1861d817c91c1d616a9f83e4a4292a5b6e3e45d7e0d6285a9a64e699a026a83f32ee938a2",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&export=Test_123", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&export=Test_123",
		);
		itRespondsWithStatus(200);
		itRespondsWithHeader("etag", 'W/"82-ejPV80zhr1VBz3oZhLRhoc1JxzU"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"a172a905a18ee14016acde6e1b4c16ca1ee27a3ef20186b95e28057278634bf6d7f5e3c69a01037586e9c7ac0949c8eaef1bd8de862cc3e4271fbdfd6783fd46",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&export='", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&export='",
		);
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&export=%27];alert(%27ha%27)//", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&export=%27];alert(%27ha%27)//",
		);
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&minify=maybe", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&minify=maybe",
		);
		itRespondsWithStatus(400);
		itRespondsWithContentType("text/html");
		itRespondsWithHeader(
			"cache-control",
			"max-age=0, must-revalidate, no-cache, no-store",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&minify=on", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&minify=on",
		);
		itRespondsWithHeader("etag", 'W/"82-uH+qVAg7HGwhfDvbvg4EDrzgPF4"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"7c5e33c51ccaff03e9626ddb47d4e958578599cfab3a790186fdd521300754cfe6d486aba41030b33a03602b82f7d935b26af446208a01faf7ec685b444de82a",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&minify=off", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&minify=off",
		);
		itRespondsWithHeader("etag", 'W/"82-IyyNyhfdZYzPMqjIzMtKhb6SOTg"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"16c6316b0aeac98d47ef21e62ec23de3495634cc51de25b917c22d2d94d7b9bc6d7e63f30dc9da692b09e57b664a3f79ca24ef5eb20d9a383b5807955854fd0a",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&autoinit=on", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&autoinit=on",
		);
		itRespondsWithHeader("etag", 'W/"82-uH+qVAg7HGwhfDvbvg4EDrzgPF4"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"7c5e33c51ccaff03e9626ddb47d4e958578599cfab3a790186fdd521300754cfe6d486aba41030b33a03602b82f7d935b26af446208a01faf7ec685b444de82a",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&autoinit=off", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&autoinit=off",
		);
		itRespondsWithHeader("etag", 'W/"82-IMlegsTmjmSHmvdewG2T+k7pLOM"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"5972d733394192ab3705372ff811d84d55cbb51ae797c81100f00547315b45076299d43d1b86ccc6733a03cdd1e2449ea538dc07340c97c192d4e2b07ed27fa8",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&autoinit=off&minify=off", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&autoinit=off&minify=off",
		);
		itRespondsWithHeader("etag", 'W/"82-nXbvb/ufdSBgSiVbiTTztgdd1pc"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"698add293fa0588b36a8d5c425e471c836ff5e96c2518d719c7ad83b67750e8eba324c8b5cd0b1f3c665f7ebcfd19365ae977051339e84f77d6ffc63c3073750",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});

	describe("GET /v3/bundles/hash?modules=o-test-component@1.0.29&autoinit=off&minify=off&export=7", function() {
		setupRequest(
			"GET",
			"/v3/bundles/hash?modules=o-test-component@1.0.29&autoinit=off&minify=off&export=7",
		);
		itRespondsWithHeader("etag", 'W/"82-/8HpOXW6PIzVN/CVGpYLaG9UbC4"');
		itRespondsWithHeader(
			"Normalized-Modules-Filename",
			"9300851d34a9c88c25c77020de55d5dc1ee8198c564f813ca1385924f59526c2cb3a9df2a412dcfd99be107719ebd39cd345183d721ba004352d70f4cd8f0103",
		);
		itRespondsWithHeader(
			"cache-control",
			"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
		);
	});
});