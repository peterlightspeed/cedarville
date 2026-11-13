"""Subscription plans. Prices are in kobo (₦1 = 100 kobo) and are PLACEHOLDERS —
change them here to whatever the school decides."""
PLANS = {
    "premium_monthly": {"name": "Monthly", "amount_kobo": 200_000, "days": 30, "blurb": "₦2,000 / month"},
    "premium_termly": {"name": "Per Term", "amount_kobo": 500_000, "days": 90, "blurb": "₦5,000 / term (3 months)"},
    "premium_yearly": {"name": "Yearly", "amount_kobo": 1_500_000, "days": 365, "blurb": "₦15,000 / year — best value"},
}

PREMIUM_FEATURES = [
    "Unlimited practice rounds in every subject",
    "All Watch & Learn videos",
    "Chat with Cedar the Owl, the friendly AI helper",
    "Weekly progress reports for parents",
    "Up to 5 children on one account",
]
