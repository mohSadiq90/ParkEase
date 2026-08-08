using ParkingApp.Application.Interfaces;
using ParkingApp.Notifications.Contracts;

namespace ParkingApp.IntegrationTests.Support;

/// <summary>
/// No-op external delivery for L4 HTTP IT — prevents Resend/Firebase hangs on outbox domain events.
/// </summary>
internal sealed class NoOpEmailService : IEmailService
{
    public Task SendEmailAsync(string to, string subject, string body, bool isHtml = true)
        => Task.CompletedTask;

    public Task SendEmailAsync(
        string to,
        string subject,
        string body,
        IReadOnlyList<EmailAttachment>? attachments,
        bool isHtml = true)
        => Task.CompletedTask;
}

internal sealed class NoOpPushNotificationService : IPushNotificationService
{
    public Task<PushResult> SendToDeviceAsync(
        string deviceToken,
        PushNotificationPayload payload,
        CancellationToken cancellationToken = default)
        => Task.FromResult(new PushResult(true, "noop"));

    public Task<PushResult> SendToUserAsync(
        Guid userId,
        PushNotificationPayload payload,
        CancellationToken cancellationToken = default)
        => Task.FromResult(new PushResult(true, "noop"));

    public Task<PushResult> SendToTopicAsync(
        string topic,
        PushNotificationPayload payload,
        CancellationToken cancellationToken = default)
        => Task.FromResult(new PushResult(true, "noop"));

    public Task<bool> SubscribeToTopicAsync(
        string deviceToken,
        string topic,
        CancellationToken cancellationToken = default)
        => Task.FromResult(true);

    public Task<bool> UnsubscribeFromTopicAsync(
        string deviceToken,
        string topic,
        CancellationToken cancellationToken = default)
        => Task.FromResult(true);
}

internal sealed class NoOpNotificationCoordinator : INotificationCoordinator
{
    public Task SendAsync(Guid userId, NotificationRequest request, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task SendBulkAsync(
        IEnumerable<Guid> userIds,
        NotificationRequest request,
        CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
