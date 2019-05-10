"use strict";

const vm = require("vm");
const proclaim = require("proclaim");
const request = require("supertest");
const service = require("../../../../lib/service");

describe("/v3/bundles/js", function() {
	let app;
	beforeEach(() => {
		return service({
			environment: "test",
			log: {
				info: () => {},
				error: () => {},
				warn: () => {},
			},
			port: 0,
		})
			.listen()
			.then(appp => {
				app = appp;
			});
	});
	afterEach(function() {
		return app.ft.server.close();
	});
	context("missing all parameters", function() {
		it("GET /v3/bundles/js", function() {
			return request(app)
				.get("/v3/bundles/js")
				.expect(400)
				.expect("Content-Type", "text/html; charset=utf-8")
				.expect(
					"cache-control",
					"max-age=0, must-revalidate, no-cache, no-store",
				);
		});
	});

	context("invalid modules parameter", function() {
		it("GET /v3/bundles/js?modules", function() {
			return request(app)
				.get("/v3/bundles/js?modules")
				.expect(400)
				.expect("Content-Type", "text/html; charset=utf-8")
				.expect(
					"cache-control",
					"max-age=0, must-revalidate, no-cache, no-store",
				);
		});

		it("GET /v3/bundles/js?modules=,,", function() {
			return request(app)
				.get("/v3/bundles/js?modules=,,")
				.expect(400)
				.expect("Content-Type", "text/html; charset=utf-8")
				.expect(
					"cache-control",
					"max-age=0, must-revalidate, no-cache, no-store",
				);
		});

		it("GET /v3/bundles/js?modules=1a-", function() {
			return request(app)
				.get("/v3/bundles/js?modules=1a-")
				.expect(400)
				.expect("Content-Type", "text/html; charset=utf-8")
				.expect(
					"cache-control",
					"max-age=0, must-revalidate, no-cache, no-store",
				);
		});
	});

	context("invalid registry parameter", function() {
		it("returns an error", function() {
			return request(app)
				.get("/v3/bundles/js?registry=carrot&source=test")
				.expect(400)
				.expect("Content-Type", "text/html; charset=utf-8")
				.expect(
					"cache-control",
					"max-age=0, must-revalidate, no-cache, no-store",
				);
		});
	});

	context("missing source parameter", function() {
		it("returns an error", function() {
			return request(app)
				.get("/v3/bundles/js?modules=o-test-component")
				.expect(400)
				.expect("Content-Type", "text/html; charset=utf-8")
				.expect(
					"cache-control",
					"max-age=0, must-revalidate, no-cache, no-store",
				);
		});
	});

	context("npm registry", function() {
		it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.32-test&source=test&registry=npm", function() {
			return request(app)
				.get(
					"/v3/bundles/js?modules=@financial-times/o-test-component@1.0.32-test&source=test&registry=npm",
				)
				.expect(200)
				.expect(
					"cache-control",
					"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
				)
				.expect("Content-Type", "application/javascript; charset=utf-8")
				.expect(response => {
					proclaim.isString(response.text);
					proclaim.doesNotThrow(() => new vm.Script(response.text));
					proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
				})
				.expect("etag", "2d5a5590fcb223dfdd73f157a6aef9cf");
		});

		context("requesting the same module multiple times", function() {
			it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.19,@financial-times/o-test-component@1.0.19&registry=npm", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=@financial-times/o-test-component@1.0.19,@financial-times/o-test-component@1.0.19&registry=npm",
					)
					.expect(400)
					.expect("Content-Type", "text/html; charset=utf-8")
					.expect(
						"cache-control",
						"max-age=0, must-revalidate, no-cache, no-store",
					);
			});

			it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.19,@financial-times/o-test-component@1.0.17%20-%201.0.19&registry=npm", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=@financial-times/o-test-component@1.0.19,@financial-times/o-test-component@1.0.17%20-%201.0.19&registry=npm",
					)
					.expect(400)
					.expect("Content-Type", "text/html; charset=utf-8")
					.expect(
						"cache-control",
						"max-age=0, must-revalidate, no-cache, no-store",
					);
			});

			it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.17,@financial-times/o-test-component@1.0.19&registry=npm", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=@financial-times/o-test-component@1.0.17,@financial-times/o-test-component@1.0.19&registry=npm",
					)
					.expect(400)
					.expect("Content-Type", "text/html; charset=utf-8")
					.expect(
						"cache-control",
						"max-age=0, must-revalidate, no-cache, no-store",
					);
			});
		});

		it("GET /v3/bundles/js?modules=@financial-times/o-autoinit@1.5,@financial-times/o-test-component@1.0.29-test&source=test&registry=npm", function() {
			return request(app)
				.get(
					"/v3/bundles/js?modules=@financial-times/o-autoinit@1.5,@financial-times/o-test-component@1.0.29-test&source=test&registry=npm",
				)
				.expect(200)
				.expect("etag", "454448fa4bf025998094ceb34ddf613a")
				.expect(
					"cache-control",
					"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
				)
				.expect("Content-Type", "application/javascript; charset=utf-8")
				.expect(response => {
					const sandbox = {
						globalThis: {},
						window: {
							addEventListener: () => {},
						},
						document: {
							addEventListener: () => {},
						},
					};
					vm.createContext(sandbox);
					proclaim.isString(response.text);
					proclaim.doesNotThrow(() => {
						vm.runInContext(response.text, sandbox);
					});
					proclaim.include(
						sandbox.Origami,
						"@financial-times/o-test-component",
					);
					proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
				});
		});

		context("invalid module name", function() {
			it("GET /v3/bundles/js?modules=o-autoinit_±-test&source=test&registry=npm", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=o-autoinit_±-test&source=test&registry=npm",
					)
					.expect(400);
			});
		});

		context("invalid minify parameter", function() {
			it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.29&minify=maybe&registry=npm", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=@financial-times/o-test-component@1.0.29&minify=maybe&registry=npm",
					)
					.expect(400)
					.expect("Content-Type", "text/html; charset=utf-8")
					.expect(
						"cache-control",
						"max-age=0, must-revalidate, no-cache, no-store",
					);
			});
		});

		context("valid minify paramters", function() {
			it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.29-test&minify=on&source=test&registry=npm", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=@financial-times/o-test-component@1.0.29-test&minify=on&source=test&registry=npm",
					)
					.expect(200)
					.expect(
						"cache-control",
						"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
					)
					.expect("Content-Type", "application/javascript; charset=utf-8")
					.expect(response => {
						const sandbox = {
							globalThis: {},
							window: {
								addEventListener: () => {},
							},
							document: {
								addEventListener: () => {},
							},
						};
						vm.createContext(sandbox);
						proclaim.isString(response.text);
						proclaim.doesNotThrow(() => {
							vm.runInContext(response.text, sandbox);
						});
						proclaim.include(
							sandbox.Origami,
							"@financial-times/o-test-component",
						);
						proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
					})
					.expect("etag", "1b5419d4fe43d2421ac3f50dd4abe897");
			});

			it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.29-test&minify=off&source=test&registry=npm", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=@financial-times/o-test-component@1.0.29-test&minify=off&source=test&registry=npm",
					)
					.expect(200)
					.expect(
						"cache-control",
						"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
					)
					.expect("Content-Type", "application/javascript; charset=utf-8")
					.expect(response => {
						const sandbox = {
							globalThis: {},
							window: {
								addEventListener: () => {},
							},
							document: {
								addEventListener: () => {},
							},
						};
						vm.createContext(sandbox);
						proclaim.isString(response.text);
						proclaim.doesNotThrow(() => {
							vm.runInContext(response.text, sandbox);
						});
						proclaim.include(
							sandbox.Origami,
							"@financial-times/o-test-component",
						);
						// proclaim.match(response.text, /\/\/#\ssourceMappingURL(.+)/);
					});
				// TODO: Ensure consistent builds when minification is turned off
				// .expect("etag", "2561e1ea36fd92d7112b95bebcff123f");
			});
		});

		context("attaches modules to the Origami global object", function() {
			it("GET /v3/bundles/js?modules=@financial-times/o-test-component@1.0.29-test&source=test&registry=npm", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=@financial-times/o-test-component@1.0.29-test&source=test&registry=npm",
					)
					.expect(200)
					.expect(
						"cache-control",
						"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
					)
					.expect("Content-Type", "application/javascript; charset=utf-8")
					.expect(response => {
						const sandbox = {
							globalThis: {},
							window: {
								addEventListener: () => {},
							},
							document: {
								addEventListener: () => {},
							},
						};
						vm.createContext(sandbox);
						proclaim.isString(response.text);
						proclaim.doesNotThrow(() => {
							vm.runInContext(response.text, sandbox);
						});
						proclaim.include(
							sandbox.Origami,
							"@financial-times/o-test-component",
						);
						proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
					})
					.expect("etag", "1b5419d4fe43d2421ac3f50dd4abe897");
			});
		});
	});

	context("bower registry", function() {
		it("GET /v3/bundles/js?modules=o-test-component@1.0.32&source=test", function() {
			return request(app)
				.get("/v3/bundles/js?modules=o-test-component@1.0.32&source=test")
				.expect(200)
				.expect(
					"cache-control",
					"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
				)
				.expect("Content-Type", "application/javascript; charset=utf-8")
				.expect(response => {
					proclaim.isString(response.text);
					proclaim.doesNotThrow(() => new vm.Script(response.text));
					proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
				})
				.expect("etag", "0a37191130d14cbfacb14353aa765b48");
		});

		it("GET /v3/bundles/js?modules=o-test-component@1.0.17%20-%201.0.32&source=test", function() {
			return request(app)
				.get(
					"/v3/bundles/js?modules=o-test-component@1.0.17%20-%201.0.32&source=test",
				)
				.expect(200)
				.expect(
					"cache-control",
					"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
				)
				.expect("Content-Type", "application/javascript; charset=utf-8")
				.expect(response => {
					proclaim.isString(response.text);
					proclaim.doesNotThrow(() => new vm.Script(response.text));
					proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
				})
				.expect("etag", "0a37191130d14cbfacb14353aa765b48");
		});

		context("requesting the same module multiple times", function() {
			it("GET /v3/bundles/js?modules=o-test-component@1.0.19,o-test-component@1.0.19", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=o-test-component@1.0.19,o-test-component@1.0.19",
					)
					.expect(400)
					.expect("Content-Type", "text/html; charset=utf-8")
					.expect(
						"cache-control",
						"max-age=0, must-revalidate, no-cache, no-store",
					);
			});

			it("GET /v3/bundles/js?modules=o-test-component@1.0.19,o-test-component@1.0.17%20-%201.0.19", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=o-test-component@1.0.19,o-test-component@1.0.17%20-%201.0.19",
					)
					.expect(400)
					.expect("Content-Type", "text/html; charset=utf-8")
					.expect(
						"cache-control",
						"max-age=0, must-revalidate, no-cache, no-store",
					);
			});

			it("GET /v3/bundles/js?modules=o-test-component@1.0.17,o-test-component@1.0.19", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=o-test-component@1.0.17,o-test-component@1.0.19",
					)
					.expect(400)
					.expect("Content-Type", "text/html; charset=utf-8")
					.expect(
						"cache-control",
						"max-age=0, must-revalidate, no-cache, no-store",
					);
			});
		});

		it("GET /v3/bundles/js?modules=o-autoinit@1.3.3,o-test-component@1.0.29&source=test", function() {
			return request(app)
				.get(
					"/v3/bundles/js?modules=o-autoinit@1.3.3,o-test-component@1.0.29&source=test",
				)
				.expect(200)
				.expect("etag", "e08b31199a2adfb9787fa392e8b9827c")
				.expect(
					"cache-control",
					"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
				)
				.expect("Content-Type", "application/javascript; charset=utf-8")
				.expect(response => {
					const sandbox = {
						globalThis: {},
						window: {
							addEventListener: () => {},
						},
						document: {
							addEventListener: () => {},
						},
					};
					vm.createContext(sandbox);
					proclaim.isString(response.text);
					proclaim.doesNotThrow(() => {
						vm.runInContext(response.text, sandbox);
					});
					proclaim.include(sandbox.Origami, "o-test-component");
					proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
				});
		});

		context("invalid module name", function() {
			it("GET /v3/bundles/js?modules=o-autoinit_±&source=test", function() {
				return request(app)
					.get("/v3/bundles/js?modules=o-autoinit_±&source=test")
					.expect(400);
			});
		});

		context("invalid minify parameter", function() {
			it("GET /v3/bundles/js?modules=o-test-component@1.0.29&minify=maybe", function() {
				return request(app)
					.get("/v3/bundles/js?modules=o-test-component@1.0.29&minify=maybe")
					.expect(400)
					.expect("Content-Type", "text/html; charset=utf-8")
					.expect(
						"cache-control",
						"max-age=0, must-revalidate, no-cache, no-store",
					);
			});
		});

		context("valid minify paramters", function() {
			it("GET /v3/bundles/js?modules=o-test-component@1.0.29&minify=on&source=test", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=o-test-component@1.0.29&minify=on&source=test",
					)
					.expect(200)
					.expect(
						"cache-control",
						"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
					)
					.expect("Content-Type", "application/javascript; charset=utf-8")
					.expect(response => {
						const sandbox = {
							globalThis: {},
							window: {
								addEventListener: () => {},
							},
							document: {
								addEventListener: () => {},
							},
						};
						vm.createContext(sandbox);
						proclaim.isString(response.text);
						proclaim.doesNotThrow(() => {
							vm.runInContext(response.text, sandbox);
						});
						proclaim.include(sandbox.Origami, "o-test-component");
						proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
					})
					.expect("etag", "436cd62f3c92da6b72a0bb68b1f12b4b");
			});

			it("GET /v3/bundles/js?modules=o-test-component@1.0.29&minify=off&source=test", function() {
				return request(app)
					.get(
						"/v3/bundles/js?modules=o-test-component@1.0.29&minify=off&source=test",
					)
					.expect(200)
					.expect(
						"cache-control",
						"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
					)
					.expect("Content-Type", "application/javascript; charset=utf-8")
					.expect(response => {
						const sandbox = {
							globalThis: {},
							window: {
								addEventListener: () => {},
							},
							document: {
								addEventListener: () => {},
							},
						};
						vm.createContext(sandbox);
						proclaim.isString(response.text);
						proclaim.doesNotThrow(() => {
							vm.runInContext(response.text, sandbox);
						});
						proclaim.include(sandbox.Origami, "o-test-component");
						// proclaim.match(response.text, /\/\/#\ssourceMappingURL(.+)/);
					});
				// TODO: Ensure consistent builds when minification is turned off
				// .expect("etag", "2561e1ea36fd92d7112b95bebcff123f");
			});
		});

		context("attaches modules to the Origami global object", function() {
			it("GET /v3/bundles/js?modules=o-test-component@1.0.29&source=test", function() {
				return request(app)
					.get("/v3/bundles/js?modules=o-test-component@1.0.29&source=test")
					.expect(200)
					.expect(
						"cache-control",
						"public, max-age=86400, stale-if-error=604800, stale-while-revalidate=300000",
					)
					.expect("Content-Type", "application/javascript; charset=utf-8")
					.expect(response => {
						const sandbox = {
							globalThis: {},
							window: {
								addEventListener: () => {},
							},
							document: {
								addEventListener: () => {},
							},
						};
						vm.createContext(sandbox);
						proclaim.isString(response.text);
						proclaim.doesNotThrow(() => {
							vm.runInContext(response.text, sandbox);
						});
						proclaim.include(sandbox.Origami, "o-test-component");
						proclaim.notMatch(response.text, /\/\/#\ssourceMappingURL(.+)/);
					})
					.expect("etag", "436cd62f3c92da6b72a0bb68b1f12b4b");
			});
		});
	});
});
