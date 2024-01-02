import { minMax } from "@tiptap/react";
import { Annotation } from "./chess";
import { BestMoves, Score } from "@/bindings";
import { Color } from "chessops";

export const INITIAL_SCORE: Score = {
    type: "cp",
    value: 15,
};

const CP_CEILING = 1000;

export function formatScore(score: Score, precision = 2): string {
    let scoreText = "";
    if (score.type === "cp") {
        scoreText = Math.abs(score.value / 100).toFixed(precision);
    } else {
        scoreText = "M" + Math.abs(score.value);
    }
    if (score.value > 0) {
        scoreText = "+" + scoreText;
    }
    if (score.value < 0) {
        scoreText = "-" + scoreText;
    }
    return scoreText;
}

export function getWinChance(centipawns: number) {
    return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * centipawns)) - 1);
}

function normalizeScores(
    prev: Score,
    next: Score,
    color: Color
): { prevCP: number; nextCP: number } {
    let prevCP = prev.value;
    let nextCP = next.value;

    if (color == "black") {
        prevCP *= -1;
        nextCP *= -1;
    }

    if (prev.type == "mate") {
        prevCP = CP_CEILING * Math.sign(prevCP);
    }
    prevCP = minMax(prevCP, -CP_CEILING, CP_CEILING);

    if (next.type == "mate") {
        nextCP = CP_CEILING * Math.sign(nextCP);
    }

    nextCP = minMax(nextCP, -CP_CEILING, CP_CEILING);

    return { prevCP, nextCP };
}

export function getAccuracy(prev: Score, next: Score, color: Color): number {
    const { prevCP, nextCP } = normalizeScores(prev, next, color);
    return minMax(
        103.1668 *
            Math.exp(-0.04354 * (getWinChance(prevCP) - getWinChance(nextCP))) -
            3.1669 +
            1,
        0,
        100
    );
}

export function getCPLoss(prev: Score, next: Score, color: Color): number {
    const { prevCP, nextCP } = normalizeScores(prev, next, color);

    return Math.max(0, prevCP - nextCP);
}

export function getAnnotation(
    prevprev: Score | null,
    prev: Score | null,
    next: Score,
    color: Color,
    prevMoves: BestMoves[],
    is_sacrifice?: boolean,
    move?: string
): Annotation {
    const { prevCP, nextCP } = normalizeScores(
        prev || { type: "cp", value: 0 },
        next,
        color
    );
    const winChanceDiff = getWinChance(prevCP) - getWinChance(nextCP);

    if (winChanceDiff > 20) {
        return "??";
    } else if (winChanceDiff > 10) {
        return "?";
    } else if (winChanceDiff > 5) {
        return "?!";
    }

    if (prevMoves.length > 1) {
        const scores = normalizeScores(
            prevMoves[0].score,
            prevMoves[1].score,
            color
        );
        if (
            getWinChance(scores.prevCP) - getWinChance(scores.nextCP) > 10 &&
            move === prevMoves[0].sanMoves[0]
        ) {
            const scores = normalizeScores(
                prevprev || { type: "cp", value: 0 },
                prevMoves[0].score,
                color
            );
            if (is_sacrifice && (getWinChance(scores.prevCP) < 90 || (prev?.type == "mate" && next.type == "mate"))) {
                return "!!";
            }
            if (getWinChance(scores.nextCP) - getWinChance(scores.prevCP) > 5) {
                return "!";
            }
        } else if (is_sacrifice && nextCP > -200) {
            return "!?";
        }
    }
    return "";
}
