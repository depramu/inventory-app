using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventoryApp.Data;
using System.Security.Claims;

namespace InventoryApp.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public IActionResult GetSummary()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var totalSales = _context.Transactions
            .Where(t => t.UserId == Guid.Parse(userId))
            .Sum(t => t.TotalPrice);

        var totalTransactions = _context.Transactions
            .Count(t => t.UserId == Guid.Parse(userId));

        var totalProducts = _context.Products
            .Count(p => p.UserId == Guid.Parse(userId));

        return Ok(new
        {
            success = true,
            data = new
            {
                totalSales,
                totalTransactions,
                totalProducts
            }
        });
    }

    [HttpGet("best-seller")]
    public IActionResult BestSeller()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var result = _context.TransactionItems
            .Join(_context.Products,
                ti => ti.ProductId,
                p => p.Id,
                (ti, p) => new { ti, p })
            .Where(x => x.p.UserId == Guid.Parse(userId))
            .GroupBy(x => x.p.Name)
            .Select(g => new
            {
                ProductName = g.Key,
                TotalSold = g.Sum(x => x.ti.Quantity)
            })
            .OrderByDescending(x => x.TotalSold)
            .Take(5)
            .ToList();

        return Ok(new
        {
            success = true,
            data = result
        });
    }
}