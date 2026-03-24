using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventoryApp.Data;
using InventoryApp.Models;
using InventoryApp.Dtos;
using System.Security.Claims;

namespace InventoryApp.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionController : ControllerBase
{
    private readonly AppDbContext _context;

    public TransactionController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new
            {
                success = false,
                errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
            });

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = Guid.Parse(userId),
            TotalPrice = 0
        };

        decimal total = 0;

        foreach (var item in dto.Items)
        {
            var product = _context.Products
                .FirstOrDefault(x => x.Id == item.ProductId && x.UserId == Guid.Parse(userId));

            if (product == null)
                throw new Exception("Product tidak ditemukan");

            if (product.Stock < item.Quantity)
                throw new Exception($"Stock tidak cukup untuk {product.Name}");

            product.Stock -= item.Quantity;

            var transactionItem = new TransactionItem
            {
                Id = Guid.NewGuid(),
                TransactionId = transaction.Id,
                ProductId = product.Id,
                Quantity = item.Quantity,
                Price = product.Price
            };

            total += product.Price * item.Quantity;

            _context.TransactionItems.Add(transactionItem);
        }

        transaction.TotalPrice = total;

        _context.Transactions.Add(transaction);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = transaction
        });
    }

    [HttpGet("history")]
    public IActionResult History()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var data = _context.Transactions
            .Where(t => t.UserId == Guid.Parse(userId))
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.TotalPrice,
                t.CreatedAt,
                Items = _context.TransactionItems
                    .Where(i => i.TransactionId == t.Id)
                    .Join(_context.Products,
                        i => i.ProductId,
                        p => p.Id,
                        (i, p) => new
                        {
                            p.Name,
                            i.Quantity,
                            i.Price
                        }).ToList()
            })
            .ToList();

        return Ok(new
        {
            success = true,
            data
        });
    }
}