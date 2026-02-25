import { describe, it, expect } from "vitest";
import { GitHubSCM, type PRInfo, type CICheck, type MergeReadiness } from "../../src/orchestration/github-scm.js";

describe("Orchestration — GitHub SCM", () => {
    describe("Command building", () => {
        it("builds PR detection command by branch", () => {
            const cmd = GitHubSCM.buildDetectPRCommand("fix/bug-123", "owner/repo");
            expect(cmd).toContain("gh pr list");
            expect(cmd).toContain("--head fix/bug-123");
            expect(cmd).toContain("--repo owner/repo");
            expect(cmd).toContain("--json");
        });

        it("builds CI checks command", () => {
            const cmd = GitHubSCM.buildCIChecksCommand(42, "owner/repo");
            expect(cmd).toContain("gh pr checks 42");
            expect(cmd).toContain("--repo owner/repo");
        });

        it("builds reviews command", () => {
            const cmd = GitHubSCM.buildReviewsCommand(42, "owner/repo");
            expect(cmd).toContain("gh pr view 42");
            expect(cmd).toContain("--json reviews");
        });
    });

    describe("Response parsing", () => {
        it("parses PR list response", () => {
            const json = JSON.stringify([
                { number: 42, url: "https://github.com/o/r/pull/42", title: "Fix bug", isDraft: false },
            ]);
            const prs = GitHubSCM.parsePRList(json);
            expect(prs).toHaveLength(1);
            expect(prs[0].number).toBe(42);
            expect(prs[0].isDraft).toBe(false);
        });

        it("returns empty for no PRs", () => {
            expect(GitHubSCM.parsePRList("[]")).toEqual([]);
        });

        it("parses CI checks", () => {
            const json = JSON.stringify([
                { name: "tests", state: "SUCCESS", link: "https://ci.example.com/1" },
                { name: "lint", state: "FAILURE", link: "https://ci.example.com/2" },
            ]);
            const checks = GitHubSCM.parseCIChecks(json);
            expect(checks).toHaveLength(2);
            expect(checks[0].state).toBe("SUCCESS");
            expect(checks[1].state).toBe("FAILURE");
        });

        it("computes merge readiness — all passing", () => {
            const readiness = GitHubSCM.computeMergeReadiness(
                [{ name: "tests", state: "SUCCESS", link: "" }],
                [{ state: "APPROVED", author: "reviewer" }],
                false,
            );
            expect(readiness.ready).toBe(true);
            expect(readiness.blockers).toHaveLength(0);
        });

        it("computes merge readiness — CI failing", () => {
            const readiness = GitHubSCM.computeMergeReadiness(
                [{ name: "tests", state: "FAILURE", link: "https://ci/1" }],
                [{ state: "APPROVED", author: "reviewer" }],
                false,
            );
            expect(readiness.ready).toBe(false);
            expect(readiness.blockers).toContain("ci_failed");
        });

        it("computes merge readiness — not approved", () => {
            const readiness = GitHubSCM.computeMergeReadiness(
                [{ name: "tests", state: "SUCCESS", link: "" }],
                [],
                false,
            );
            expect(readiness.ready).toBe(false);
            expect(readiness.blockers).toContain("no_approval");
        });

        it("computes merge readiness — has conflicts", () => {
            const readiness = GitHubSCM.computeMergeReadiness(
                [{ name: "tests", state: "SUCCESS", link: "" }],
                [{ state: "APPROVED", author: "r" }],
                true,
            );
            expect(readiness.blockers).toContain("conflicts");
        });
    });

    describe("Bot filtering", () => {
        it("filters known bot logins", () => {
            const reviews = [
                { state: "APPROVED", author: "human-dev" },
                { state: "APPROVED", author: "github-actions" },
                { state: "APPROVED", author: "dependabot" },
            ];
            const filtered = GitHubSCM.filterBotReviews(reviews);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].author).toBe("human-dev");
        });
    });
});
