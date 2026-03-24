using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace InventoryApp.Dtos;

public class CreateTransactionDto
{
    public List<TransactionItemDto> Items { get; set; } = new();
}

public class TransactionItemDto
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Quantity minimal 1")]
    [DefaultValue(1)]
    public int Quantity { get; set; }
}