using System.Collections.Concurrent;
using ParkingApp.Identity.Application.Interfaces;

namespace ParkingApp.Identity.Infrastructure.Services.ExternalAuth;

/// <summary>
/// In-process sliding window for failed linkPassword attempts (per normalized email).
/// Default: 5 failures per 15 minutes → rate_limited.
/// </summary>
internal sealed class LinkPasswordAttemptTracker : ILinkPasswordAttemptTracker
{
    private readonly ConcurrentDictionary<string, Queue<DateTime>> _failures = new(StringComparer.Ordinal);
    private readonly int _maxFailures;
    private readonly TimeSpan _window;

    public LinkPasswordAttemptTracker(int maxFailures = 5, TimeSpan? window = null)
    {
        _maxFailures = Math.Clamp(maxFailures, 1, 100);
        _window = window ?? TimeSpan.FromMinutes(15);
    }

    public bool IsLimited(string emailNormalized)
    {
        if (string.IsNullOrWhiteSpace(emailNormalized))
            return false;

        var key = emailNormalized.Trim().ToLowerInvariant();
        if (!_failures.TryGetValue(key, out var queue))
            return false;

        lock (queue)
        {
            Prune(queue);
            return queue.Count >= _maxFailures;
        }
    }

    public void RecordFailure(string emailNormalized)
    {
        if (string.IsNullOrWhiteSpace(emailNormalized))
            return;

        var key = emailNormalized.Trim().ToLowerInvariant();
        var queue = _failures.GetOrAdd(key, _ => new Queue<DateTime>());
        lock (queue)
        {
            Prune(queue);
            queue.Enqueue(DateTime.UtcNow);
        }
    }

    public void RecordSuccess(string emailNormalized)
    {
        if (string.IsNullOrWhiteSpace(emailNormalized))
            return;

        var key = emailNormalized.Trim().ToLowerInvariant();
        _failures.TryRemove(key, out _);
    }

    private void Prune(Queue<DateTime> queue)
    {
        var cutoff = DateTime.UtcNow - _window;
        while (queue.Count > 0 && queue.Peek() < cutoff)
            queue.Dequeue();
    }
}
