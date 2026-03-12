-- Fix: User Plus Yearly price should be discounted (€24.90/year instead of €19.90)
UPDATE subscription_plans SET local_price = 24.90, monthly_price = 24.90 WHERE plan_name = 'User Plus Yearly';