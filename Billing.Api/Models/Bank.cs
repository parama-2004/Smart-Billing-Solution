using System.ComponentModel.DataAnnotations;

namespace Billing.Api.Models
{
    public class Bank
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }
}
