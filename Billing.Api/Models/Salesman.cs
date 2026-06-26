using System;

namespace Billing.Api.Models;

public class Salesman
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;
    public DateTime DateOfBirth { get; set; }
    public string Address { get; set; } = "";
    public string City { get; set; } = "";
    public string Mobile { get; set; } = "";

    public DateTime DateOfJoin { get; set; }

    public bool IsActive { get; set; } = true;
}
