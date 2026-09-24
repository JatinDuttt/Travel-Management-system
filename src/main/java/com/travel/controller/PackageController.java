package com.travel.controller;

import com.travel.entity.TravelPackage;
import com.travel.repository.TravelPackageRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/packages")
@RequiredArgsConstructor
public class PackageController {
    private final TravelPackageRepository repo;

    @GetMapping // ?destination=goa&maxPrice=20000&page=0&size=10&sort=price,asc
    public Page<TravelPackage> search(@RequestParam(defaultValue = "") String destination,
                                      @RequestParam(defaultValue = "1000000000") BigDecimal maxPrice,
                                      Pageable pageable) {
        return repo.findByDestinationContainingIgnoreCaseAndPriceLessThanEqual(destination, maxPrice, pageable);
    }

    @GetMapping("/{id}")
    public TravelPackage get(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Package not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TravelPackage create(@Valid @RequestBody TravelPackage p) {
        p.setId(null);
        return repo.save(p);
    }

    @PutMapping("/{id}")
    public TravelPackage update(@PathVariable Long id, @Valid @RequestBody TravelPackage in) {
        TravelPackage p = get(id);
        p.setName(in.getName());
        p.setDestination(in.getDestination());
        p.setPrice(in.getPrice());
        p.setStartDate(in.getStartDate());
        p.setAvailableSeats(in.getAvailableSeats());
        p.setDescription(in.getDescription());
        return repo.save(p);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { repo.deleteById(id); }
}
