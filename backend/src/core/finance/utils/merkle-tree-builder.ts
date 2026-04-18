/**
 * MerkleTreeBuilder
 * ──────────────────
 * Pure utility — no DI, no side effects.
 *
 * Builds a SHA-256 Merkle tree over an array of leaf hashes
 * and provides O(log n) proof generation and verification.
 *
 * Convention:
 *  - Internal node hash = SHA-256(leftHash + rightHash)
 *  - Odd leaf count: last leaf is duplicated (standard Merkle padding)
 */

import * as crypto from 'crypto';

export interface MerkleTree {
  /** levels[0] = leaves, levels[last] = [root] */
  levels: string[][];
}

export class MerkleTreeBuilder {
  private static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Build a full Merkle tree from leaf data strings.
   * Each leaf is hashed before being added to the tree.
   * @param leaves  Raw data strings (e.g., entryHash values)
   */
  static build(leaves: string[]): MerkleTree {
    if (leaves.length === 0) throw new Error('MERKLE_EMPTY_LEAVES: cannot build tree with zero leaves');

    // Hash leaves
    let level: string[] = leaves.map((l) => MerkleTreeBuilder.hash(l));
    const levels: string[][] = [level];

    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : level[i]; // duplicate last if odd
        nextLevel.push(MerkleTreeBuilder.hash(left + right));
      }
      levels.push(nextLevel);
      level = nextLevel;
    }

    return { levels };
  }

  /** Return the Merkle root (top-level single hash). */
  static getRoot(tree: MerkleTree): string {
    const top = tree.levels[tree.levels.length - 1];
    return top[0];
  }

  /**
   * Generate the proof path (sibling hashes) for a leaf at the given index.
   * Returns an array of { sibling, positions: 'left'|'right' } tuples.
   */
  static getProof(
    tree: MerkleTree,
    leafIndex: number,
  ): Array<{ sibling: string; position: 'left' | 'right' }> {
    const proof: Array<{ sibling: string; position: 'left' | 'right' }> = [];
    let index = leafIndex;

    for (let level = 0; level < tree.levels.length - 1; level++) {
      const currentLevel = tree.levels[level];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;
      const sibling =
        siblingIndex < currentLevel.length
          ? currentLevel[siblingIndex]
          : currentLevel[index]; // duplicate padding

      proof.push({
        sibling,
        position: isRightNode ? 'left' : 'right',
      });

      index = Math.floor(index / 2);
    }

    return proof;
  }

  /**
   * Verify a leaf is included in a tree with the given root.
   * O(log n) — traverses only the proof path.
   *
   * @param leafData  Raw leaf value (will be hashed before verification)
   * @param proof     Proof path from getProof()
   * @param root      Expected Merkle root
   */
  static verify(
    leafData: string,
    proof: Array<{ sibling: string; position: 'left' | 'right' }>,
    root: string,
  ): boolean {
    let current = MerkleTreeBuilder.hash(leafData);

    for (const { sibling, position } of proof) {
      if (position === 'left') {
        current = MerkleTreeBuilder.hash(sibling + current);
      } else {
        current = MerkleTreeBuilder.hash(current + sibling);
      }
    }

    return current === root;
  }
}
