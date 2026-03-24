using Microsoft.AspNetCore.Mvc;
using InventoryApp.Services;
using InventoryApp.DTOs;

namespace InventoryApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new
            {
                success = false,
                errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
            });

        await _auth.Register(dto);

        return Ok(new
        {
            success = true,
            message = "Register berhasil"
        });
    }

    [HttpPost("login")]
    public IActionResult Login(LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new
            {
                success = false,
                errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
            });

        var token = _auth.Login(dto);

        if (token == null)
            throw new Exception("Email atau password salah");

        return Ok(new
        {
            success = true,
            token
        });
    }
}