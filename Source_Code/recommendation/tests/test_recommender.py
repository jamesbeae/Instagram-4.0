import sys
from pathlib import Path
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from recommender import als_update, objective, temporal_split, top_k, ranking_metrics, prune_train


class AlgorithmTests(unittest.TestCase):
    def test_sparse_update_matches_dense_normal_equations(self):
        y = np.array([[0.2, 0.3], [0.7, 0.4], [0.5, 0.8]])
        groups = [np.array([0, 2]), np.array([1])]
        actual = als_update(y, groups, 5, 0.1)
        for user, ids in enumerate(groups):
            p = np.zeros(3)
            p[ids] = 1
            c = np.diag(1 + 5 * p)
            expected = np.linalg.solve(y.T @ c @ y + 0.1 * np.eye(2), y.T @ c @ p)
            np.testing.assert_allclose(actual[user], expected)

    def test_objective_matches_dense_and_decreases(self):
        x = np.array([[0.2, 0.1], [0.4, 0.2]])
        y = np.array([[0.2, 0.3], [0.7, 0.4], [0.5, 0.8]])
        groups = [np.array([0, 2]), np.array([1])]
        p = np.array([[1, 0, 1], [0, 1, 0]])
        dense = np.sum((1 + 5 * p) * (p - x @ y.T)**2) + 0.1 * (np.sum(x*x) + np.sum(y*y))
        self.assertAlmostEqual(objective(x, y, groups, 5, 0.1), dense)
        updated = als_update(y, groups, 5, 0.1)
        self.assertLessEqual(objective(updated, y, groups, 5, 0.1), dense)

    def test_time_ties_never_cross_boundaries(self):
        rows = [("u", str(i), i // 3) for i in range(60)]
        parts, first, second = temporal_split(rows)
        self.assertLess(max(r[2] for r in parts[0]), first)
        self.assertLess(max(r[2] for r in parts[1]), second)
        self.assertEqual(sum(map(len, parts)), len(rows))

    def test_ranking_excludes_seen_and_breaks_ties(self):
        ranked = top_k([3, 5, 3, 2], np.array([1]), 10)
        self.assertEqual(ranked.tolist(), [0, 2, 3])
        recall, ndcg = ranking_metrics([0, 2, 3], {0, 3}, 2)
        self.assertEqual(recall, 0.5)
        self.assertAlmostEqual(ndcg, 1 / (1 + 1 / np.log2(3)))

    def test_iterative_core_filter(self):
        rows = [("a", "x", 1), ("a", "y", 2), ("b", "x", 1),
                ("b", "y", 2), ("c", "z", 3), ("c", "x", 4)]
        kept = prune_train(rows, 2, 2, 0, 42)
        self.assertEqual({r[0] for r in kept}, {"a", "b"})
        self.assertEqual(len(kept), 4)


if __name__ == "__main__":
    unittest.main()
