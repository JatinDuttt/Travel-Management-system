package com.travel.controller;

import com.travel.entity.Hotel;
import com.travel.repository.HotelRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor
public class HotelController {
    private final HotelRepository repo;

    @GetMapping
    public Page<Hotel> search(@RequestParam(defaultValue = "") String city, Pageable pageable) {
        return repo.findByCityContainingIgnoreCase(city, pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Hotel create(@Valid @RequestBody Hotel h) {
        h.setId(null);
        return repo.save(h);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { repo.deleteById(id); }
}
