/**
 * GitHub SCM integration — PR detection, CI checks, merge readiness.
 * From ORCHESTRATION_DESIGN.md: port of agent-orchestrator's scm-github plugin.
 */

export interface PRInfo {
    number: number;
    url: string;
    title: string;
    isDraft: boolean;
}

export interface CICheck {
    name: string;
    state: string;
    link: string;
}

export interface Review {
    state: string;
    author: string;
}

export interface MergeReadiness {
    ready: boolean;
    blockers: string[];
}

const BOT_LOGINS = new Set([
    "github-actions", "github-actions[bot]",
    "dependabot", "dependabot[bot]",
    "codecov", "codecov[bot]",
    "renovate", "renovate[bot]",
]);

export class GitHubSCM {
    static buildDetectPRCommand(branch: string, repo: string): string {
        return `gh pr list --head ${branch} --repo ${repo} --json number,url,title,isDraft`;
    }

    static buildCIChecksCommand(prNumber: number, repo: string): string {
        return `gh pr checks ${prNumber} --repo ${repo} --json name,state,link`;
    }

    static buildReviewsCommand(prNumber: number, repo: string): string {
        return `gh pr view ${prNumber} --repo ${repo} --json reviews`;
    }

    static parsePRList(jsonStr: string): PRInfo[] {
        try {
            return JSON.parse(jsonStr) as PRInfo[];
        } catch {
            return [];
        }
    }

    static parseCIChecks(jsonStr: string): CICheck[] {
        try {
            return JSON.parse(jsonStr) as CICheck[];
        } catch {
            return [];
        }
    }

    static filterBotReviews(reviews: Review[]): Review[] {
        return reviews.filter((r) => !BOT_LOGINS.has(r.author));
    }

    static computeMergeReadiness(
        checks: CICheck[],
        reviews: Review[],
        hasConflicts: boolean,
    ): MergeReadiness {
        const blockers: string[] = [];
        const humanReviews = GitHubSCM.filterBotReviews(reviews);

        // CI check
        const ciPassing = checks.every((c) => c.state === "SUCCESS");
        if (!ciPassing) blockers.push("ci_failed");

        // Approval check
        const hasApproval = humanReviews.some((r) => r.state === "APPROVED");
        if (!hasApproval) blockers.push("no_approval");

        // Changes requested
        const changesRequested = humanReviews.some((r) => r.state === "CHANGES_REQUESTED");
        if (changesRequested) blockers.push("changes_requested");

        // Conflicts
        if (hasConflicts) blockers.push("conflicts");

        return { ready: blockers.length === 0, blockers };
    }
}
