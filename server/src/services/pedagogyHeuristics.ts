import { Chess } from 'chess.js';
import type {
  ExplainMoveRequest,
  ExplainMoveResponse,
  CoachChatRequest,
  CoachChatResponse,
  GameSummaryRequest,
  GameSummaryResponse,
} from '../types';

export class PedagogyHeuristics {
  /**
   * Generates a pedagogical explanation for a specific move.
   */
  public static explainMove(req: ExplainMoveRequest): ExplainMoveResponse {
    const { moveSan, classification, bestMove, tacticalMotifs, evalBefore, evalAfter, playerIntent } = req;
    const deltaCp = Math.abs(evalAfter - evalBefore);

    let commentary = '';
    let keyTacticalIdea = '';
    let betterPlan: string | undefined;

    switch (classification) {
      case 'brilliant':
        commentary = `Incredible tactical vision! ${moveSan} is a stunning masterstroke that sacrifices material to seize an overwhelming attack, rip open king lines, and dismantle opponent coordination.`;
        keyTacticalIdea = `Deep calculation that prioritizes checkmating nets or king infiltration over mere material balance.`;
        break;

      case 'great':
        commentary = `A master-level find! ${moveSan} was the single precise continuation required to retain the dynamic initiative and nullify the opponent's counterplay.`;
        keyTacticalIdea = `Finding the only path through complex tactical tension.`;
        break;

      case 'best':
        commentary = `Textbook precision. ${moveSan} perfectly aligns with top engine evaluation, maximizing central control, piece harmony, and pressing advantage.`;
        keyTacticalIdea = `Maintaining optimal piece activity and structural harmony without conceding tactical weaknesses.`;
        break;

      case 'excellent':
        commentary = `Strong, purposeful move. ${moveSan} makes solid progress, preserves the advantage, and minimizes variance from the absolute theoretical top choice.`;
        keyTacticalIdea = `Practical, confident play keeping pieces active and coordinated.`;
        break;

      case 'book':
        commentary = `Standard opening theory. ${moveSan} follows established grandmaster preparation, contending for central control and rapid piece mobilization.`;
        keyTacticalIdea = `Opening tenets: rapid development, early king safety, and staking central outposts.`;
        break;

      case 'inaccuracy':
        commentary = `${moveSan} is slightly suboptimal, conceding roughly ${(deltaCp / 100).toFixed(1)} pawns in evaluation. It allows the opponent a momentary breathing room to reorganize.`;
        keyTacticalIdea = `Allowed the opponent a brief tempo to untangle or contest key squares.`;
        betterPlan = bestMove ? `Consider ${bestMove} to maintain maximum positional squeeze.` : undefined;
        break;

      case 'mistake':
        commentary = playerIntent
          ? `Mistake: ${playerIntent}. ${moveSan} opens up tactical weaknesses that the opponent can exploit.`
          : `${moveSan} compromises coordination. It surrenders critical control and invites active opponent counter-threats.`;
        keyTacticalIdea = tacticalMotifs && tacticalMotifs.length > 0
          ? `Tactical motif involved: ${tacticalMotifs.join(', ').replace(/_/g, ' ')}.`
          : `Compromised piece coordination and king security.`;
        betterPlan = bestMove ? `The critical continuation was ${bestMove} to maintain defensive stability.` : undefined;
        break;

      case 'blunder':
        commentary = playerIntent
          ? `Critical Blunder: ${playerIntent}. This completely swings the evaluation in the opponent's favor.`
          : `A devastating blunder! ${moveSan} fatally damages your position by losing vital material or conceding a decisive attack.`;
        keyTacticalIdea = tacticalMotifs && tacticalMotifs.includes('hanging_piece')
          ? `Leaves a piece unprotected or falls into a forced tactical trap.`
          : `Surrenders an overwhelming advantage with immediate tactical repercussions.`;
        betterPlan = bestMove ? `Essential was ${bestMove} to prevent immediate decisive material or positional collapse.` : undefined;
        break;

      case 'missed_win':
        commentary = `A decisive knockout was within reach, but ${moveSan} lets the opponent off the hook!`;
        keyTacticalIdea = `Overlooked an unstoppable mating sequence or forced material capture.`;
        betterPlan = bestMove ? `The winning combination was ${bestMove}!` : undefined;
        break;

      default:
        commentary = `${moveSan} is a solid positional move, keeping the position balanced and pieces coordinated.`;
        keyTacticalIdea = `Steady positional maneuvering and control.`;
    }

    return {
      commentary,
      keyTacticalIdea,
      betterPlan,
      source: 'heuristic',
    };
  }

  /**
   * Answers user's conversational questions based on live board geometry and move context.
   */
  public static answerQuestion(req: CoachChatRequest): CoachChatResponse {
    const { fen, question, playerSide = 'w', bestMove, currentMoveSan, classification } = req;
    const lowerQ = question.toLowerCase().trim();

    let answer = '';
    let suggestedQuestions: string[] = [];

    try {
      const chess = new Chess(fen);
      const isCheck = chess.inCheck();
      const turn = chess.turn();
      const moves = chess.moves({ verbose: true });
      const activeColor = turn === 'w' ? 'White' : 'Black';
      const enemyColor = turn === 'w' ? 'Black' : 'White';

      // 1. Question: "Why was this move played?" or asking about the current move
      if (
        lowerQ.includes('why was') ||
        lowerQ.includes('why did') ||
        lowerQ.includes('why played') ||
        lowerQ.includes('purpose of') ||
        (lowerQ.includes('why') && currentMoveSan && lowerQ.includes(currentMoveSan.toLowerCase()))
      ) {
        if (currentMoveSan) {
          if (classification === 'blunder' || classification === 'mistake') {
            answer = `${currentMoveSan} was played with the intent to attack or develop, but it was tactically flawed! It overlooked opponent counter-threats or left critical squares unprotected. ${bestMove ? `The grandmaster choice was **${bestMove}**, preserving harmony.` : ''}`;
            suggestedQuestions = ['What did I overlook here?', 'What is the top engine move?', 'How should I defend now?'];
          } else if (classification === 'book') {
            answer = `${currentMoveSan} is standard opening theory. It directly contests central space, enables piece activity, and prepares king shelter according to established master lines.`;
            suggestedQuestions = ['What is the main plan in this opening?', 'What pawn breaks should I prepare?', 'What is the best move now?'];
          } else if (classification === 'brilliant' || classification === 'great') {
            answer = `${currentMoveSan} is an exceptional move! It seizes tactical initiative, opens attacking files, and creates immediate threats that force concessions from the opponent.`;
            suggestedQuestions = ['Why is this sacrifice sound?', 'What is the winning continuation?', 'What is the opponent planning?'];
          } else {
            answer = `${currentMoveSan} was played to advance active piece coordination, control key central squares, and restrict ${enemyColor}'s piece mobility.`;
            suggestedQuestions = ['What is the best plan now?', 'Is my king safe?', 'What is the top engine move?'];
          }
        } else {
          answer = `In this position, moves focus on establishing central control, coordinating minor pieces, and ensuring king security before entering tactical skirmishes.`;
          suggestedQuestions = ['What is the best move here?', 'What is my strategic plan?'];
        }
      }

      // 2. Question: "What did I overlook?" or asking about blunders/mistakes
      else if (
        lowerQ.includes('overlook') ||
        lowerQ.includes('miss') ||
        lowerQ.includes('mistake') ||
        lowerQ.includes('blunder') ||
        lowerQ.includes('what went wrong')
      ) {
        if (classification === 'blunder' || classification === 'missed_win') {
          answer = `You overlooked that ${currentMoveSan || 'the move'} conceded vital tactical leverage! It left pieces vulnerable or allowed the opponent to seize an overwhelming counter-attack. ${bestMove ? `Playing **${bestMove}** would have secured the position.` : ''}`;
        } else if (classification === 'mistake' || classification === 'inaccuracy') {
          answer = `You overlooked a more active continuation. ${currentMoveSan || 'Your move'} surrendered a fraction of your initiative and allowed ${enemyColor} to coordinate their pieces. ${bestMove ? `The cleaner line was **${bestMove}**.` : ''}`;
        } else {
          answer = `Your position is tactically sound. However, always remain vigilant against sneaky forks, back-rank weaknesses, and hanging pawns on semi-open files.`;
        }
        suggestedQuestions = ['What is the top engine move?', 'What should my plan be?', 'Is my king safe?'];
      }

      // 3. Question: "What is my plan?" or "What should I do now?"
      else if (
        lowerQ.includes('plan') ||
        lowerQ.includes('what should i do') ||
        lowerQ.includes('strategy') ||
        lowerQ.includes('what to do')
      ) {
        const hasQueens = chess.board().some((row) => row.some((p) => p && p.type === 'q'));
        const checks = moves.filter((m) => m.san.includes('+'));
        const captures = moves.filter((m) => m.captured);

        let planTactics = '';
        if (checks.length > 0) {
          planTactics = `You have tactical checks available (${checks.map((c) => c.san).slice(0, 2).join(', ')}). `;
        } else if (captures.length > 0) {
          planTactics = `Look for tactical tension with captures like ${captures.map((c) => c.san).slice(0, 2).join(', ')}. `;
        }

        answer = `Grandmaster Plan for ${activeColor}:
1) **Center Control**: Place knights and rooks on active central files.
2) **King Shield**: Verify your king has adequate pawn coverage and no back-rank vulnerabilities.
3) **Pawn Breaks**: Look to push central pawns to crack open lines for your heavy pieces. ${planTactics}${bestMove ? `Top priority move: **${bestMove}**.` : ''}`;
        suggestedQuestions = ['Which piece should I improve next?', 'Is my king safe here?', 'What is the top engine move?'];
      }

      // 4. Question: "Is my king safe?" / King Safety
      else if (
        lowerQ.includes('king') ||
        lowerQ.includes('safe') ||
        lowerQ.includes('safety') ||
        lowerQ.includes('checkmate')
      ) {
        if (isCheck) {
          answer = `⚠️ **CRITICAL DANGER**: Your King is in direct check! You must respond immediately by capturing the attacker, interposing a piece, or stepping out of danger.`;
          suggestedQuestions = ['What is the best move to escape check?', 'Can I block the check?'];
        } else {
          answer = `Assessing King Safety for ${activeColor}:
- Examine the f, g, and h pawns: if pushed, dark or light square diagonals may be vulnerable to enemy queen/bishop batteries.
- Ensure your back rank has an escape square ('luft') so you aren't caught in back-rank tactics.
- Keep at least one minor piece defending your king's perimeter.`;
          suggestedQuestions = ['What is my opponent planning next?', 'What is the best move now?'];
        }
      }

      // 5. Question: "What is the best move?" / "What move should I play?"
      else if (
        lowerQ.includes('best move') ||
        lowerQ.includes('engine move') ||
        lowerQ.includes('recommend') ||
        lowerQ.includes('top move')
      ) {
        if (bestMove) {
          answer = `The engine's top recommendation is **${bestMove}**. This move applies maximum pressure, preserves tactical balance, and prevents opponent counterplay.`;
          suggestedQuestions = [`Why is ${bestMove} the best move?`, 'What is the follow-up plan?', 'What does the opponent threaten?'];
        } else {
          const topCandidate = moves[0]?.san || 'Nf3';
          answer = `Consider **${topCandidate}**. It mobilizes your pieces towards the center and increases active pressure.`;
          suggestedQuestions = ['What is my strategic plan?', 'Is my king safe?'];
        }
      }

      // 6. Question: "What is my opponent planning?" / Threat Analysis
      else if (
        lowerQ.includes('opponent') ||
        lowerQ.includes('threat') ||
        lowerQ.includes('defend') ||
        lowerQ.includes('attacking')
      ) {
        answer = `${enemyColor} is looking to exploit open files and find outposts for their minor pieces. Scan the board for:
1) Direct checks or mating nets against your king.
2) Unprotected pieces (tactical targets).
3) Pawn breaks that dismantle your pawn structure.
Always ask yourself: *'What did my opponent's last move threaten?'* before making your own move.`;
        suggestedQuestions = ['How do I prevent their plan?', 'What is the top engine move?', 'Is my king safe?'];
      }

      // 7. General Fallback with Context
      else {
        answer = `In this position (${activeColor} to move): Focus on piece harmony, active central outposts, and king security. ${bestMove ? `The most dynamic candidate move is **${bestMove}**.` : 'Evaluate which of your pieces is least active and find a way to improve its square.'}`;
        suggestedQuestions = ['Why was this move played?', 'What is my strategic plan?', 'Is my king safe?'];
      }
    } catch {
      answer = `Great question! In this position, maintain active piece coordination, control central outposts, and always ask what threat your opponent created with their last move.`;
      suggestedQuestions = ['What is the best move here?', 'What is my strategic plan?'];
    }

    return {
      answer,
      suggestedQuestions,
      source: 'heuristic',
    };
  }

  /**
   * Generates a pedagogical post-game summary.
   */
  public static generateGameSummary(req: GameSummaryRequest): GameSummaryResponse {
    const { whiteAccuracy, blackAccuracy, openingName, openingEco, blundersCount } = req;

    const winner = whiteAccuracy > blackAccuracy + 5
      ? 'White'
      : blackAccuracy > whiteAccuracy + 5
      ? 'Black'
      : 'Both sides fought evenly';

    const narrative = `This match featured the ${openingName || 'Standard Opening'} (${openingEco || 'Theory'}). ${winner} demonstrated superior tactical precision across the middle game. While there were ${blundersCount} critical turning points, the tactical tension rewarded the player who capitalized fastest on exposed piece geometry.`;

    const whiteHighlights = [
      `Maintained ${whiteAccuracy}% accuracy throughout the contest.`,
      `Demonstrated solid opening knowledge in the early plies.`,
    ];

    const blackHighlights = [
      `Registered ${blackAccuracy}% precision across all phases.`,
      `Created counter-chances during the complex middle-game transition.`,
    ];

    const criticalTurningPoint = blundersCount > 0
      ? `A critical blunder shifted the win probability drastically when an undefended piece opened decisive tactical lines.`
      : `The game was decided by progressive positional pressure and piece activity.`;

    const keyLesson = `Always ask what your opponent's last move threatens before committing to your own plan. Prophylaxis prevents sudden blunders!`;

    return {
      narrative,
      whiteHighlights,
      blackHighlights,
      criticalTurningPoint,
      keyLesson,
      source: 'heuristic',
    };
  }
}
