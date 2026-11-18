"""Request bodies.

Fields are deliberately lenient (``Any``): the browser is untrusted, so every
value is coerced and validated in the service layer, which returns
field-level messages the storefront can show next to each input.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class LooseBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    def data(self) -> dict[str, Any]:
        return self.model_dump()


class PostcodeBody(LooseBody):
    postcode: Any = None


class QuoteBody(LooseBody):
    lines: Any = None
    postcode: Any = None
    promoCode: Any = None
    redeemPoints: Any = None


class CheckoutBody(LooseBody):
    lines: Any = None
    customer: Any = None
    address: Any = None
    chilledDate: Any = None
    chilledSlotId: Any = None
    promoCode: Any = None
    redeemPoints: Any = None
    saveAddress: Any = None
    idempotencyKey: Any = None
    expectedTotalPence: Any = None


class DemoPaymentBody(LooseBody):
    reference: Any = None
    cardNumber: Any = None
    expiry: Any = None
    cvc: Any = None


class LoginBody(LooseBody):
    email: Any = None
    password: Any = None


class RegisterBody(LooseBody):
    name: Any = None
    email: Any = None
    phone: Any = None
    password: Any = None
    confirmPassword: Any = None
    referralCode: Any = None
    marketingEmail: Any = None


class AddressBody(LooseBody):
    action: Any = None
    id: Any = None
    label: Any = None
    line1: Any = None
    line2: Any = None
    city: Any = None
    postcode: Any = None
    isDefault: Any = None


class DetailsBody(LooseBody):
    name: Any = None
    email: Any = None
    phone: Any = None


class PasswordBody(LooseBody):
    currentPassword: Any = None
    newPassword: Any = None


class PreferencesBody(LooseBody):
    marketingEmail: Any = None
    marketingSms: Any = None


class FormBody(LooseBody):
    name: Any = None
    email: Any = None
    topic: Any = None
    message: Any = None
    consent: Any = None
