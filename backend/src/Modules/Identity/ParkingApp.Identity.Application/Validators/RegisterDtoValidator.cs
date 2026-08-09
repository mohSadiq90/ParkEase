using FluentValidation;
using ParkingApp.Identity.Application.DTOs;

namespace ParkingApp.Identity.Application.Validators;

internal class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    public RegisterDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters");

        RuleFor(x => x.Password).ApplyPasswordPolicy();

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(100).WithMessage("First name must not exceed 100 characters")
            .Matches(@"^[a-zA-Z\s'-]+$").WithMessage("First name contains invalid characters");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(100).WithMessage("Last name must not exceed 100 characters")
            .Matches(@"^[a-zA-Z\s'-]+$").WithMessage("Last name contains invalid characters");

        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Phone number is required")
            .Matches(@"^\+?[1-9]\d{9,14}$").WithMessage("Invalid phone number format");
    }
}

internal class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required");
    }
}

internal class ExternalLoginDtoValidator : AbstractValidator<ExternalLoginDto>
{
    public ExternalLoginDtoValidator()
    {
        RuleFor(x => x.Provider)
            .NotEmpty().WithMessage("Provider is required")
            .MaximumLength(32).WithMessage("Provider must not exceed 32 characters");

        RuleFor(x => x.IdToken)
            .NotEmpty().WithMessage("Id token is required")
            .MaximumLength(16_384).WithMessage("Id token is too long");

        RuleFor(x => x.Nonce)
            .MaximumLength(512).WithMessage("Nonce is too long")
            .When(x => x.Nonce is not null);

        RuleFor(x => x.FirstName)
            .MaximumLength(100).WithMessage("First name must not exceed 100 characters")
            .When(x => x.FirstName is not null);

        RuleFor(x => x.LastName)
            .MaximumLength(100).WithMessage("Last name must not exceed 100 characters")
            .When(x => x.LastName is not null);

        RuleFor(x => x.LinkPassword)
            .MaximumLength(100).WithMessage("Link password is too long")
            .When(x => x.LinkPassword is not null);
    }
}

internal class LinkExternalLoginDtoValidator : AbstractValidator<LinkExternalLoginDto>
{
    public LinkExternalLoginDtoValidator()
    {
        RuleFor(x => x.Provider)
            .NotEmpty().WithMessage("Provider is required")
            .MaximumLength(32).WithMessage("Provider must not exceed 32 characters");

        RuleFor(x => x.IdToken)
            .NotEmpty().WithMessage("Id token is required")
            .MaximumLength(16_384).WithMessage("Id token is too long");

        RuleFor(x => x.Nonce)
            .MaximumLength(512).WithMessage("Nonce is too long")
            .When(x => x.Nonce is not null);
    }
}

internal class SetPasswordDtoValidator : AbstractValidator<SetPasswordDto>
{
    public SetPasswordDtoValidator()
    {
        RuleFor(x => x.NewPassword).ApplyPasswordPolicy();
    }
}

internal class ChangePasswordDtoValidator : AbstractValidator<ChangePasswordDto>
{
    public ChangePasswordDtoValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Current password is required");

        RuleFor(x => x.NewPassword).ApplyPasswordPolicy();
    }
}
