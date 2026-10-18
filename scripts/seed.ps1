# Adds sample trips and hotels through the admin API.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\seed.ps1
#         powershell -ExecutionPolicy Bypass -File scripts\seed.ps1 -BaseUrl http://localhost:8090
param([string]$BaseUrl = "https://travel.duttjatin.pro", [string]$Email = "admin@travel.com")

$sec = Read-Host "Admin password for $BaseUrl" -AsSecureString
$pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" `
  -Body (@{ email = $Email; password = $pw } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($login.token)" }

function Add($path, $obj) {
  try {
    $r = Invoke-RestMethod -Method Post -Uri "$BaseUrl$path" -Headers $h -ContentType "application/json" -Body ($obj | ConvertTo-Json)
    Write-Host "added $($r.name)"
  } catch { Write-Host "FAILED $($obj.name): $($_.Exception.Message)" -ForegroundColor Red }
}
function In($days) { (Get-Date).AddDays($days).ToString("yyyy-MM-dd") }

# Remove the two test trips from early testing (ignored if they are already gone)
try {
  $old = Invoke-RestMethod -Uri "$BaseUrl/api/packages?size=100"
  foreach ($p in $old.content) {
    if ($p.name -in @("goa", "dfgh", "varansi")) {
      try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/api/packages/$($p.id)" -Headers $h | Out-Null; Write-Host "removed $($p.name)" }
      catch { Write-Host "could not remove $($p.name): $($_.Exception.Message)" -ForegroundColor Yellow }
    }
  }
} catch { }

$trips = @(
  @{ name = "Goa Beach Escape";          destination = "Goa";        price = 14500; startDate = (In 30); availableSeats = 25; description = "4 nights near Baga and Calangute with a sunset cruise." },
  @{ name = "Jaipur Heritage Weekend";   destination = "Jaipur";     price = 9800;  startDate = (In 21); availableSeats = 20; description = "Amber Fort, City Palace and a Rajasthani food walk." },
  @{ name = "Kerala Backwaters";         destination = "Alleppey";   price = 18900; startDate = (In 45); availableSeats = 16; description = "A night on a houseboat, then Munnar tea estates." },
  @{ name = "Manali Mountain Break";     destination = "Manali";     price = 16500; startDate = (In 60); availableSeats = 18; description = "Solang Valley, Atal Tunnel and a bonfire evening." },
  @{ name = "Rishikesh Rafting Retreat"; destination = "Rishikesh";  price = 8200;  startDate = (In 14); availableSeats = 22; description = "River rafting, yoga mornings and Ganga aarti." },
  @{ name = "Andaman Island Hopping";    destination = "Port Blair"; price = 28900; startDate = (In 75); availableSeats = 14; description = "Havelock, Neil Island and snorkelling at Elephant Beach." },
  @{ name = "Ladakh Road Trip";          destination = "Leh";        price = 32500; startDate = (In 90); availableSeats = 12; description = "Pangong Lake, Nubra Valley and monasteries over 7 days." },
  @{ name = "Varanasi Spiritual Trail";  destination = "Varanasi";   price = 7600;  startDate = (In 25); availableSeats = 24; description = "Dawn boat ride, Kashi Vishwanath and Sarnath." },
  @{ name = "Udaipur Lake City Getaway"; destination = "Udaipur";    price = 11200; startDate = (In 35); availableSeats = 20; description = "Lake Pichola boat ride, City Palace and old-town bazaars." },
  @{ name = "Darjeeling Tea Hills";      destination = "Darjeeling"; price = 13800; startDate = (In 50); availableSeats = 16; description = "Toy train, tea estate tour and Tiger Hill sunrise." },
  @{ name = "Hampi Ruins Weekend";       destination = "Hampi";      price = 9400;  startDate = (In 40); availableSeats = 18; description = "Vijayanagara temples, boulder hills and a coracle ride." },
  @{ name = "Amritsar Golden Temple Trail"; destination = "Amritsar"; price = 6900; startDate = (In 18); availableSeats = 26; description = "Golden Temple, Jallianwala Bagh and the Wagah border ceremony." }
)
$hotels = @(
  @{ name = "The Baga Residency";     city = "Goa";        pricePerNight = 4200; rooms = 12 },
  @{ name = "Pink City Haveli";       city = "Jaipur";     pricePerNight = 3600; rooms = 10 },
  @{ name = "Backwater Bliss Resort"; city = "Alleppey";   pricePerNight = 5200; rooms = 8 },
  @{ name = "Pine Valley Lodge";      city = "Manali";     pricePerNight = 3900; rooms = 10 },
  @{ name = "Ganga View Stay";        city = "Rishikesh";  pricePerNight = 2800; rooms = 14 },
  @{ name = "Marina Bay Inn";         city = "Port Blair"; pricePerNight = 6100; rooms = 6 },
  @{ name = "Himalayan Camp Leh";     city = "Leh";        pricePerNight = 4800; rooms = 7 },
  @{ name = "Ghat Side Haveli";       city = "Varanasi";   pricePerNight = 3100; rooms = 9 },
  @{ name = "Lake Pichola Palace Stay"; city = "Udaipur";  pricePerNight = 7400; rooms = 8 },
  @{ name = "Tea Garden Inn";         city = "Darjeeling"; pricePerNight = 3500; rooms = 10 },
  @{ name = "Boulder Hills Resort";   city = "Hampi";      pricePerNight = 3300; rooms = 9 },
  @{ name = "Heritage Courtyard";     city = "Amritsar";   pricePerNight = 3000; rooms = 11 }
)
foreach ($t in $trips)  { Add "/api/packages" $t }
foreach ($x in $hotels) { Add "/api/hotels" $x }
Write-Host "Done."
