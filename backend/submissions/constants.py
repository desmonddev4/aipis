from .models import Submission


APPLICATION_CAPS = {
    Submission.Kind.KEYNOTE: 6,
    Submission.Kind.GUEST: 6,
    Submission.Kind.TECHNICAL: 12,
    Submission.Kind.POSTER: 20,
    Submission.Kind.EXHIBITOR: 30,
}

ACTIVE_APPLICATION_STATUSES = {
    Submission.Status.NEW,
    Submission.Status.IN_PROGRESS,
    Submission.Status.APPROVED,
    Submission.Status.WAITLISTED,
}
