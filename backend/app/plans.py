"""Subscription plans. Prices are in kobo (₦1 = 100 kobo) and are PLACEHOLDERS —
change them here to whatever the school decides."""
PLANS = {
    "premium_monthly": {"name": "Monthly", "amount_kobo": 200_000, "days": 30, "blurb": "₦2,000 / month"},
    "premium_termly": {"name": "Per Term", "amount_kobo": 500_000, "days": 90, "blurb": "₦5,000 / term (3 months)"},
    "premium_yearly": {"name": "Yearly", "amount_kobo": 1_500_000, "days": 365, "blurb": "₦15,000 / year"},
}

PREMIUM_FEATURES = [
    "Unlimited practice rounds in every subject",
    "All Watch & Learn videos",
    "More chats with Cedar the Owl, the friendly AI helper",
    "Progress insights: what your child is strong at and what to practise next",
    "Up to 5 children on one account",
]


def plan_cards() -> list[dict]:
    """Plans with the per-month price and the saving against paying monthly (shown on the upgrade page)."""
    monthly = PLANS["premium_monthly"]["amount_kobo"] / PLANS["premium_monthly"]["days"] * 30
    out = []
    for code, p in PLANS.items():
        per_month = p["amount_kobo"] / p["days"] * 30
        saving = round(100 * (1 - per_month / monthly)) if per_month < monthly else 0
        out.append({"code": code, "name": p["name"], "amount_kobo": p["amount_kobo"], "blurb": p["blurb"],
                    "per_month_kobo": round(per_month), "saving_pct": saving, "days": p["days"]})
    return out


def comparison(settings) -> list[dict]:
    """Free vs Premium rows shown on the website, in the app and in the tour. Numbers come from real settings."""
    free_subjects = ", ".join(x.capitalize() for x in settings.free_subjects)
    return [
        {"feature": "Daily quiz (5 questions, all subjects)", "free": "✅", "premium": "✅"},
        {"feature": "Stars, streaks and stickers", "free": "✅", "premium": "✅"},
        {"feature": "Practice rounds", "free": f"{settings.free_practice_per_day} a day", "premium": "Unlimited"},
        {"feature": "Practice subjects", "free": free_subjects, "premium": "All subjects"},
        {"feature": "Watch & Learn videos", "free": "Starter videos", "premium": "All videos"},
        {"feature": "Cedar the Owl (AI helper)", "free": f"{settings.free_ai_per_day} questions a day", "premium": f"{settings.ai_daily_limit} a day"},
        {"feature": "Progress for parents", "free": "Stars this week", "premium": "+ strengths & what to practise"},
        {"feature": "Child profiles", "free": f"{settings.free_max_children}", "premium": f"Up to {settings.premium_max_children}"},
    ]
