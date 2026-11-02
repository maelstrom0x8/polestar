use std::collections::BTreeMap;

use math::Rational;

use crate::error::AllocationError;

pub(crate) fn affordability_price<V: Ord>(
    cost: u128,
    supporters: &[V],
    voter_budget: &BTreeMap<V, Rational>,
) -> Result<Option<Rational>, AllocationError> {
    if supporters.is_empty() {
        return Ok(None);
    }

    let mut sorted: Vec<(Rational, &V)> = supporters
        .iter()
        .map(|v| {
            let budget = *voter_budget
                .get(v)
                .expect("every supporter must have a tracked virtual budget");
            (budget, v)
        })
        .collect();
    sorted.sort_by(|(b1, v1), (b2, v2)| b1.cmp(b2).then_with(|| v1.cmp(v2)));

    let t = sorted.len();
    let cost = Rational::from_u128(cost);
    let mut prefix = Rational::ZERO;

    for (k, (budget_k, _)) in sorted.iter().enumerate() {
        let denom = Rational::from_u128((t - k) as u128);
        let numerator = cost.checked_sub(prefix)?;
        let rho = numerator.checked_div(denom)?;
        if rho <= *budget_k {
            return Ok(Some(rho));
        }
        prefix = prefix.checked_add(*budget_k)?;
    }

    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn budgets(pairs: &[(&str, (u128, u128))]) -> BTreeMap<String, Rational> {
        pairs
            .iter()
            .map(|(v, (n, d))| (v.to_string(), Rational::new(*n, *d).unwrap()))
            .collect()
    }

    #[test]
    fn zero_supporters_is_unaffordable() {
        let b = BTreeMap::new();
        let supporters: Vec<String> = vec![];
        assert_eq!(affordability_price(10, &supporters, &b).unwrap(), None);
    }

    #[test]
    fn exact_fit_at_first_step() {
        let b = budgets(&[("v1", (5, 3)), ("v2", (5, 3)), ("v3", (5, 3))]);
        let supporters = vec!["v1".to_string(), "v2".to_string(), "v3".to_string()];
        let rho = affordability_price(5, &supporters, &b).unwrap().unwrap();
        assert_eq!(rho, Rational::new(5, 3).unwrap());
    }

    #[test]
    fn total_budget_insufficient_is_unaffordable() {
        let b = budgets(&[("v1", (3, 1)), ("v2", (3, 1)), ("v3", (3, 1))]);
        let supporters = vec!["v1".to_string(), "v2".to_string(), "v3".to_string()];
        assert_eq!(affordability_price(10, &supporters, &b).unwrap(), None);
    }

    #[test]
    fn uneven_budgets_require_multiple_steps() {
        let b = budgets(&[("v1", (1, 1)), ("v2", (3, 1)), ("v3", (10, 1))]);
        let supporters = vec!["v1".to_string(), "v2".to_string(), "v3".to_string()];
        let rho = affordability_price(7, &supporters, &b).unwrap().unwrap();
        assert_eq!(rho, Rational::new(3, 1).unwrap());
    }

    #[test]
    fn zero_cost_is_trivially_affordable_with_any_supporter() {
        let b = budgets(&[("v1", (1, 1))]);
        let supporters = vec!["v1".to_string()];
        let rho = affordability_price(0, &supporters, &b).unwrap().unwrap();
        assert_eq!(rho, Rational::ZERO);
    }
}
