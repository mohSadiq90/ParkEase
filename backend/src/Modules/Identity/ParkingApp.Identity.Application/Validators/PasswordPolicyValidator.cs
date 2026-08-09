using FluentValidation;

namespace ParkingApp.Identity.Application.Validators;

/// <summary>
/// Shared password complexity rules (KD-SL-17) for Register, SetPassword, and ChangePassword new password.
/// </summary>
public static class PasswordPolicyValidator
{
    public const int MinLength = 8;
    public const int MaxLength = 100;

    /// <summary>Apply full register-grade password rules to a string property.</summary>
    public static IRuleBuilderOptions<T, string> ApplyPasswordPolicy<T>(
        this IRuleBuilderInitial<T, string> ruleBuilder)
    {
        return ruleBuilder
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(MinLength).WithMessage($"Password must be at least {MinLength} characters")
            .MaximumLength(MaxLength).WithMessage($"Password must not exceed {MaxLength} characters")
            .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter")
            .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter")
            .Matches(@"[0-9]").WithMessage("Password must contain at least one digit")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character");
    }
}
