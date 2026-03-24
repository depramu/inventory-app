using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

public class CreateProductDto
{
    [Required(ErrorMessage = "Nama wajib diisi")]
    public string Name { get; set; } = "";

    [Range(1, int.MaxValue)]
    [DefaultValue(1)]
    public int Stock { get; set; }

    [Range(1, int.MaxValue)]
    [DefaultValue(1000)]
    public decimal Price { get; set; }
}