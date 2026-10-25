from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("submit/", views.submit, name="submit"),
    path("application-status/", views.application_status, name="application-status"),
    path("registration/checkout/", views.registration_checkout, name="registration-checkout"),
    path("payments/callback/", views.payment_callback, name="payment-callback"),
    path("payments/webhook/", views.payment_webhook, name="payment-webhook"),
]
