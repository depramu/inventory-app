using InventoryApp.Data;
using InventoryApp.Dtos;
using InventoryApp.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InventoryApp.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateProductDto dto)
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

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Stock = dto.Stock,
            Price = dto.Price,
            UserId = Guid.Parse(userId)
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = product
        });
    }

    [HttpGet]
    public IActionResult GetAll(int page = 1, int pageSize = 10)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var query = _context.Products
            .Where(x => x.UserId == Guid.Parse(userId));

        var total = query.Count();

        var data = query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new
        {
            success = true,
            total,
            page,
            pageSize,
            data
        });
    }

    [HttpGet("search")]
    public IActionResult Search(string keyword)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var data = _context.Products
            .Where(x => x.UserId == Guid.Parse(userId) &&
                        x.Name.Contains(keyword))
            .ToList();

        return Ok(new
        {
            success = true,
            data
        });
    }

    [HttpGet("sorted")]
    public IActionResult GetSorted(string sortBy = "name")
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var query = _context.Products
            .Where(x => x.UserId == Guid.Parse(userId));

        query = sortBy switch
        {
            "price" => query.OrderBy(x => x.Price),
            "stock" => query.OrderBy(x => x.Stock),
            _ => query.OrderBy(x => x.Name)
        };

        return Ok(new
        {
            success = true,
            data = query.ToList()
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, CreateProductDto dto)
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

        var product = _context.Products
            .FirstOrDefault(x => x.Id == id && x.UserId == Guid.Parse(userId));

        if (product == null)
            throw new Exception("Product tidak ditemukan");

        product.Name = dto.Name;
        product.Stock = dto.Stock;
        product.Price = dto.Price;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = product
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var product = _context.Products
            .FirstOrDefault(x => x.Id == id && x.UserId == Guid.Parse(userId));

        if (product == null)
            throw new Exception("Product tidak ditemukan");

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Deleted"
        });
    }

    [HttpGet("low-stock")]
    public IActionResult LowStock()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? throw new Exception("User tidak valid");

        var products = _context.Products
            .Where(p => p.UserId == Guid.Parse(userId) && p.Stock < 5)
            .ToList();

        return Ok(new
        {
            success = true,
            data = products
        });
    }
}