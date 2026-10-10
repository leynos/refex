SHELL := bash
.DEFAULT_GOAL := help

BUN ?= bun
RESCRIPT = $(BUN) run --bun rescript
BIOME = $(BUN) run --bun biome
# --dot lints Markdown under dot-directories such as .github, matching the
# coverage of the replaced markdownlint-cli2 default. `.markdownlint.jsonc`
# supplies the rule policy and `.markdownlintignore` the exclusions.
MDLINT = $(BUN) run --bun markdownlint --dot
MDTABLEFIX ?= mdtablefix
MDTABLEFIX_RULES = --git --include-untracked --wrap --renumber --breaks --ellipsis --fences
UV ?= uv
# Defaults, not overrides. A CI provisioner such as astral-sh/setup-uv exports
# UV_CACHE_DIR and fails its post-job cache save when uv wrote somewhere else,
# so the environment must win where it supplies a location.
UV_CACHE_DIR ?= .uv-cache
UV_TOOL_DIR ?= .uv-tools
# v0.1.3, pinned to the peeled tag commit rather than a mutable ref.
TYPOS_CONFIG_BUILDER = UV_CACHE_DIR=$(UV_CACHE_DIR) UV_TOOL_DIR=$(UV_TOOL_DIR) \
	$(UV) tool run --python 3.14.7 --from \
	"git+https://github.com/leynos/typos-config-builder.git@c8a4f95d7cf7f6a1b7517f2775d122d47d5721eb" \
	typos-config-builder

.PHONY: help install build watch clean fmt check-fmt check-generated typecheck lint \
	test coverage markdownlint spelling docs-check package-check audit all

help: ## List contributor entrypoints
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "%-20s %s\n", $$1, $$2}' Makefile

install: ## Install exactly the committed dependency graph
	$(BUN) install --frozen-lockfile

build: ## Compile the ReScript project, including dev-source tests
	$(RESCRIPT) build

watch: ## Rebuild ReScript when source changes
	$(RESCRIPT) watch

clean: ## Remove compiler output and coverage artefacts
	$(RESCRIPT) clean
	rm -rf coverage

fmt: ## Apply canonical ReScript, support-file and Markdown formatting
	$(RESCRIPT) format src/*.res src/*.resi tests/*.res
	$(BIOME) format --write .
	$(MDTABLEFIX) --in-place $(MDTABLEFIX_RULES)
	$(MDLINT) --fix "**/*.md"

check-fmt: ## Check formatting without rewriting source
	$(RESCRIPT) format --check src/*.res src/*.resi tests/*.res
	$(BIOME) check --linter-enabled=false --assist-enabled=false .
	$(MDTABLEFIX) --check $(MDTABLEFIX_RULES)

check-generated: ## Build and reject missing, untracked or stale production JavaScript
	+$(MAKE) build
	$(BUN) scripts/check-generated.mjs

typecheck: ## Compile every source with project warnings treated as errors
	$(RESCRIPT) build

lint: ## Enforce compiler and authored support-file static checks
	+$(MAKE) typecheck
	$(BIOME) lint .

test: ## Compile and explicitly execute the ReScript and JavaScript suites
	+$(MAKE) build
	$(BUN) test ./tests/Bootstrap.test.res.mjs ./tests/consumer.test.mjs \
		./tests/dependency-contracts.test.mjs ./tests/generated-gate.test.mjs \
		./tests/makefile-contracts.test.mjs ./tests/markdown-contracts.test.mjs \
		./tests/package-contracts.test.mjs ./tests/workflow-contracts.test.mjs

coverage: ## Measure generated JavaScript and write text plus LCOV reports
	+$(MAKE) build
	$(BUN) test --coverage --coverage-reporter=text --coverage-reporter=lcov \
		--coverage-dir=coverage ./tests/Bootstrap.test.res.mjs ./tests/consumer.test.mjs

markdownlint: ## Lint Markdown with the committed policy
	$(MDLINT) "**/*.md"

spelling: ## Regenerate and enforce the shared en-GB-oxendict spelling policy
	$(TYPOS_CONFIG_BUILDER) gate --repository .

docs-check: ## Check Markdown formatting and lint without changing documents
	$(MDTABLEFIX) --check $(MDTABLEFIX_RULES)
	+$(MAKE) markdownlint

package-check: ## Verify a clean archive and isolated JS/ReScript consumers
	+$(MAKE) clean
	+$(MAKE) check-generated
	$(BUN) scripts/package-check.mjs

audit: ## Audit the installed lockfile using the pinned Bun advisory client
	$(BUN) audit

all: ## Execute commit gates sequentially even under make -j
	+$(MAKE) check-fmt
	+$(MAKE) check-generated
	+$(MAKE) lint
	+$(MAKE) test
	+$(MAKE) docs-check
	+$(MAKE) spelling
	+$(MAKE) package-check
